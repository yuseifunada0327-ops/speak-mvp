import { NextRequest, NextResponse } from "next/server";

/**
 * 音声→テキスト変換 (Whisper)
 *
 * POST /api/transcribe
 * form-data: audio (音声ファイル)
 * response: { text }
 */

const MOCK_TEXTS = [
  "I'd like a medium latte, please.",
  "Could I have a window seat?",
  "I think remote work has many benefits.",
  "Could you say that again, please?",
  "I'm not sure I agree with that point.",
];

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      text: MOCK_TEXTS[Math.floor(Math.random() * MOCK_TEXTS.length)],
      mock: true,
    });
  }

  const formData = await req.formData();
  const audio = formData.get("audio") as File | null;
  if (!audio) {
    return NextResponse.json({ error: "audio required" }, { status: 400 });
  }

  const openaiForm = new FormData();
  openaiForm.append("file", audio);
  openaiForm.append("model", "whisper-1");
  openaiForm.append("language", "en");

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
    const data = await res.json();
    return NextResponse.json({ text: data.text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
