import { NextRequest, NextResponse } from "next/server";

/**
 * TTS (Text-to-Speech) エンドポイント
 *
 * POST /api/tts
 * body: { text, voice? }
 *
 * OpenAI TTS API を使用、未設定時は 204 を返してクライアント側 Web Speech API にフォールバック
 */

export async function POST(req: NextRequest) {
  const { text, voice = "nova" } = await req.json();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return new NextResponse(null, { status: 204 });
  }

  if (!text || typeof text !== "string" || text.length > 4000) {
    return NextResponse.json({ error: "invalid text" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        voice, // alloy/echo/fable/onyx/nova/shimmer
        input: text,
        response_format: "mp3",
        speed: 1.0,
      }),
    });

    if (!res.ok) {
      return new NextResponse(null, { status: 204 });
    }

    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
