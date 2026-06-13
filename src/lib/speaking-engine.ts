/**
 * スピーキング機能のコアエンジン
 *
 * 役割:
 * - 音声録音 (MediaRecorder)
 * - 音声認識 (Whisper API)
 * - 発音採点 (4軸: 正確性/流暢性/完全性/韻律)
 * - 会話履歴のコンテキスト管理
 * - フィードバック生成
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type PronunciationScore = {
  overall: number; // 総合 0-100
  accuracy: number; // 正確性 (音素レベル)
  fluency: number; // 流暢性 (詰まり・速度)
  completeness: number; // 完全性 (発話の網羅性)
  prosody: number; // 韻律 (リズム・イントネーション)
};

export type SpeakingFeedback = {
  reply: string; // AIの応答
  corrections?: string[]; // 文法・語彙の訂正
  betterPhrasing?: string; // より自然な言い回し
  encouragement?: string; // 励まし
};

// ---------------------------------------------
// 録音管理クラス
// ---------------------------------------------
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private audioContext: AudioContext | null = null;
  private onAmplitude?: (level: number) => void;
  private animationFrameId: number | null = null;

  async start(onAmplitude?: (level: number) => void): Promise<void> {
    this.onAmplitude = onAmplitude;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (e) {
      throw new Error(
        "マイクへのアクセスが拒否されました。ブラウザの設定で許可してください。"
      );
    }

    // 波形可視化のためのAudioContext
    this.audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);
    this.updateAmplitude();

    // MIME type フォールバック (Safari対応)
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start(100);
  }

  private updateAmplitude = () => {
    if (!this.analyser || !this.onAmplitude) return;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    this.onAmplitude(Math.min(1, rms * 3));
    this.animationFrameId = requestAnimationFrame(this.updateAmplitude);
  };

  async stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) return reject(new Error("not recording"));
      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || "audio/webm";
        const blob = new Blob(this.chunks, { type: mimeType });
        this.cleanup();
        resolve(blob);
      };
      this.mediaRecorder.stop();
    });
  }

  cancel() {
    if (this.mediaRecorder?.state !== "inactive") {
      try {
        this.mediaRecorder?.stop();
      } catch {}
    }
    this.cleanup();
  }

  private cleanup() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.audioContext?.close().catch(() => {});
    this.audioContext = null;
    this.analyser = null;
    this.mediaRecorder = null;
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }
}

// ---------------------------------------------
// API クライアント
// ---------------------------------------------

export async function transcribeAudio(audio: Blob): Promise<string> {
  const fd = new FormData();
  fd.append("audio", audio, "speech.webm");
  const res = await fetch("/api/transcribe", { method: "POST", body: fd });
  if (!res.ok) throw new Error(`transcribe failed: ${res.status}`);
  const data = await res.json();
  return data.text ?? "";
}

export async function chatWithAI(
  scenarioId: string,
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string,
  mode: "scenario" | "opinion" = "scenario"
): Promise<SpeakingFeedback> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scenarioId,
      systemPrompt,
      history,
      userMessage,
      mode,
    }),
  });
  if (!res.ok) throw new Error(`chat failed: ${res.status}`);
  return res.json();
}

export async function scorePronunciation(
  audio: Blob,
  referenceText: string
): Promise<PronunciationScore> {
  const fd = new FormData();
  fd.append("audio", audio, "speech.webm");
  fd.append("reference", referenceText);
  const res = await fetch("/api/pronunciation", {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error(`pronunciation failed: ${res.status}`);
  return res.json();
}

// ---------------------------------------------
// TTS (Text-to-Speech)
// ---------------------------------------------

export async function speakText(text: string, rate = 1.0): Promise<void> {
  // 1. サーバーTTS（OpenAI TTS）を試す
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("audio")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.playbackRate = rate;
        await audio.play();
        audio.onended = () => URL.revokeObjectURL(url);
        return;
      }
    }
  } catch {
    // フォールスルー
  }

  // 2. Web Speech API フォールバック
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = rate * 0.95;
    // 高品質ボイスを優先
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => v.name.includes("Google") && v.lang.startsWith("en")) ||
      voices.find((v) => v.lang.startsWith("en-US")) ||
      voices.find((v) => v.lang.startsWith("en"));
    if (preferred) utter.voice = preferred;
    window.speechSynthesis.speak(utter);
  }
}

// ---------------------------------------------
// 簡易発音採点 (オフライン/API無し時のフォールバック)
// ---------------------------------------------

export function approximatePronunciationScore(
  spokenText: string,
  expectedText?: string
): PronunciationScore {
  // 発話の長さ・単語数からスコアを推定
  const words = spokenText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // 基本スコア
  let accuracy = 75 + Math.random() * 20;
  let fluency = 70 + Math.min(25, wordCount * 2);
  let completeness = 80;
  let prosody = 72 + Math.random() * 18;

  // 参考テキストがある場合は単語の一致率を見る
  if (expectedText) {
    const expectedWords = expectedText
      .toLowerCase()
      .replace(/[.,!?]/g, "")
      .split(/\s+/);
    const spokenLower = spokenText.toLowerCase().replace(/[.,!?]/g, "");
    const matched = expectedWords.filter((w) =>
      spokenLower.includes(w)
    ).length;
    const ratio = expectedWords.length
      ? matched / expectedWords.length
      : 0.8;
    completeness = Math.round(ratio * 100);
    accuracy = Math.round(60 + ratio * 35);
  }

  const clamp = (n: number) => Math.max(40, Math.min(100, Math.round(n)));
  accuracy = clamp(accuracy);
  fluency = clamp(fluency);
  completeness = clamp(completeness);
  prosody = clamp(prosody);

  const overall = Math.round(
    accuracy * 0.4 + fluency * 0.25 + completeness * 0.2 + prosody * 0.15
  );

  return { overall, accuracy, fluency, completeness, prosody };
}
