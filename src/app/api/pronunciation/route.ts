import { NextRequest, NextResponse } from "next/server";

/**
 * 発音採点エンドポイント
 *
 * POST /api/pronunciation
 * form-data: audio (音声), reference (参考テキスト, optional)
 *
 * 実装方針:
 * 1. Whisper で音声 → テキスト変換
 * 2. word_timestamps から流暢性スコアを計算 (発話速度・ポーズ数)
 * 3. 参考テキストとの編集距離から正確性スコアを計算
 * 4. 4軸スコア (正確性 / 流暢性 / 完全性 / 韻律) を返却
 *
 * Production: Azure Pronunciation Assessment との置き換えを推奨
 */

type WhisperWord = { word: string; start: number; end: number };
type WhisperVerbose = {
  text: string;
  duration?: number;
  words?: WhisperWord[];
  segments?: { avg_logprob: number; no_speech_prob: number }[];
};

function clamp(n: number, min = 40, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

// Levenshtein 距離（単語単位）
function wordEditRatio(a: string, b: string): number {
  const aw = a.toLowerCase().replace(/[.,!?'"]/g, "").split(/\s+/).filter(Boolean);
  const bw = b.toLowerCase().replace(/[.,!?'"]/g, "").split(/\s+/).filter(Boolean);
  if (aw.length === 0 || bw.length === 0) return 0;
  const dp = Array.from({ length: aw.length + 1 }, () =>
    new Array(bw.length + 1).fill(0)
  );
  for (let i = 0; i <= aw.length; i++) dp[i][0] = i;
  for (let j = 0; j <= bw.length; j++) dp[0][j] = j;
  for (let i = 1; i <= aw.length; i++) {
    for (let j = 1; j <= bw.length; j++) {
      dp[i][j] =
        aw[i - 1] === bw[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const dist = dp[aw.length][bw.length];
  return 1 - dist / Math.max(aw.length, bw.length);
}

function computeFluency(verbose: WhisperVerbose): number {
  const words = verbose.words ?? [];
  const dur = verbose.duration ?? 0;
  if (words.length === 0 || dur === 0) return 75;

  // 発話速度: words per minute (WPM)
  const wpm = (words.length / dur) * 60;
  // ネイティブの自然な会話 WPM ≈ 140-180
  let wpmScore = 100;
  if (wpm < 60) wpmScore = 55;
  else if (wpm < 90) wpmScore = 72;
  else if (wpm < 120) wpmScore = 85;
  else if (wpm <= 200) wpmScore = 95;
  else wpmScore = 80;

  // 単語間ポーズ
  let longPauses = 0;
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap > 0.7) longPauses++;
  }
  const pausePenalty = Math.min(25, longPauses * 4);

  return clamp(wpmScore - pausePenalty);
}

function computeAccuracy(verbose: WhisperVerbose): number {
  // Whisper segment の avg_logprob から音素レベルの確信度を推定
  const segs = verbose.segments ?? [];
  if (segs.length === 0) return 75;
  const avg =
    segs.reduce((s, x) => s + (x.avg_logprob ?? -0.5), 0) / segs.length;
  // logprob -0.1 (高) 〜 -1.0 (低) → 95 〜 50
  const score = 100 + avg * 50; // -0.1 → 95, -1.0 → 50
  return clamp(score);
}

function computeProsody(verbose: WhisperVerbose): number {
  const words = verbose.words ?? [];
  if (words.length < 3) return 72;
  // 単語あたりの所要時間のばらつき → リズム指標
  const durations: number[] = [];
  for (let i = 0; i < words.length; i++) {
    durations.push(words[i].end - words[i].start);
  }
  const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
  const variance =
    durations.reduce((s, d) => s + (d - mean) ** 2, 0) / durations.length;
  const cv = Math.sqrt(variance) / (mean || 0.001); // 変動係数
  // 自然な英語のリズムは適度なばらつき (CV 0.4-0.8)
  let score = 75;
  if (cv >= 0.4 && cv <= 0.9) score = 90;
  else if (cv < 0.2) score = 65; // 平坦すぎる
  else if (cv > 1.3) score = 60; // 不安定
  return clamp(score);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  const formData = await req.formData();
  const audio = formData.get("audio") as File | null;
  const reference = (formData.get("reference") as string) || "";

  if (!audio) {
    return NextResponse.json({ error: "audio required" }, { status: 400 });
  }

  // モック応答
  if (!apiKey) {
    const accuracy = 70 + Math.round(Math.random() * 25);
    const fluency = 65 + Math.round(Math.random() * 30);
    const completeness = 75 + Math.round(Math.random() * 20);
    const prosody = 68 + Math.round(Math.random() * 25);
    const overall = Math.round(
      accuracy * 0.4 + fluency * 0.25 + completeness * 0.2 + prosody * 0.15
    );
    return NextResponse.json({
      overall,
      accuracy,
      fluency,
      completeness,
      prosody,
      mock: true,
      transcript: "(mock) I'd like a medium latte, please.",
    });
  }

  // Whisper (verbose_json + word timestamps)
  const openaiForm = new FormData();
  openaiForm.append("file", audio);
  openaiForm.append("model", "whisper-1");
  openaiForm.append("language", "en");
  openaiForm.append("response_format", "verbose_json");
  openaiForm.append("timestamp_granularities[]", "word");

  try {
    const res = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: openaiForm,
      }
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: await res.text() },
        { status: res.status }
      );
    }
    const data: WhisperVerbose = await res.json();

    const accuracy = computeAccuracy(data);
    const fluency = computeFluency(data);
    const prosody = computeProsody(data);
    const completeness = reference
      ? clamp(wordEditRatio(data.text, reference) * 100)
      : clamp(75 + (data.text?.split(/\s+/).length ?? 0) * 1.5);

    const overall = Math.round(
      accuracy * 0.4 + fluency * 0.25 + completeness * 0.2 + prosody * 0.15
    );

    return NextResponse.json({
      overall,
      accuracy,
      fluency,
      completeness,
      prosody,
      transcript: data.text,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
