import { NextRequest, NextResponse } from "next/server";

/**
 * 強化版 AI 会話エンドポイント
 *
 * POST /api/chat
 * body: {
 *   scenarioId, systemPrompt, history, userMessage, mode: 'scenario'|'opinion'
 * }
 * response: {
 *   reply, corrections?, betterPhrasing?, encouragement?
 * }
 */

type ChatRole = "system" | "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

function buildSystemPrompt(
  baseSystemPrompt: string,
  mode: "scenario" | "opinion"
): string {
  const common = `
You are an English conversation tutor for Japanese learners.
Your job:
1. Stay strictly IN character for the scenario described below.
2. Reply naturally, in ONE to THREE sentences.
3. Push the conversation forward — ask a follow-up question or share something the learner can react to.
4. If the learner makes obvious grammar mistakes, do NOT correct them inline; the system will surface corrections separately.
5. Use vocabulary appropriate to the indicated CEFR level.

After your in-character reply, output a JSON block (on a new line, wrapped in <feedback>...</feedback>) with optional fields:
- "corrections": array of strings, only for clear grammatical/vocabulary errors (max 2). Each item: "❌ <wrong> → ✅ <correct>: <short reason in Japanese>"
- "betterPhrasing": one short string suggesting a more natural way to say the learner's sentence (in English), only when it would meaningfully help. Format: "💡 Try: <suggestion>"
- "encouragement": one short string in Japanese acknowledging what the learner did well (max 30 chars), only when they used a notable phrase or showed effort

Omit the JSON block entirely if no feedback is warranted. Never include fields with empty values.
`;

  const modeSpecific =
    mode === "opinion"
      ? `
DEBATE MODE — Take a position OPPOSITE to what the learner argues. Probe their reasoning with sharp questions, but stay respectful. Push them to defend their view with evidence and examples. This builds critical thinking and argumentation skills in English.`
      : `
SCENARIO MODE — Roleplay realistically. React as a real person would. Help the learner practice fluency through natural conversation.`;

  return `${common}\n\nScenario:\n${baseSystemPrompt}\n${modeSpecific}`;
}

function parseFeedback(raw: string): {
  reply: string;
  corrections?: string[];
  betterPhrasing?: string;
  encouragement?: string;
} {
  const match = raw.match(/<feedback>([\s\S]*?)<\/feedback>/);
  let reply = raw.replace(/<feedback>[\s\S]*?<\/feedback>/, "").trim();

  if (!match) return { reply };

  try {
    const json = JSON.parse(match[1].trim());
    return {
      reply,
      corrections: Array.isArray(json.corrections) && json.corrections.length
        ? json.corrections
        : undefined,
      betterPhrasing: json.betterPhrasing || undefined,
      encouragement: json.encouragement || undefined,
    };
  } catch {
    return { reply };
  }
}

const MOCK_REPLIES: Record<string, string[]> = {
  cafe: [
    "Sure thing! Would you like that hot or iced?",
    "Great choice! Anything to eat with that?",
    "That'll be $5.50. Will you pay by card or cash?",
  ],
  airport: [
    "Thank you. How many bags are you checking today?",
    "Would you prefer a window or an aisle seat?",
    "All set. Your gate is B12, and boarding begins at 10:30.",
  ],
  interview: [
    "Interesting background. What attracted you to this role specifically?",
    "Can you describe a challenging problem you solved recently?",
    "Where do you see yourself in five years?",
  ],
  default: [
    "That's an interesting point. Could you tell me more?",
    "I see what you mean. What makes you think so?",
    "Good observation. How would you approach that differently?",
  ],
};

function mockReply(scenarioId: string): string {
  const pool = MOCK_REPLIES[scenarioId] || MOCK_REPLIES.default;
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    scenarioId = "default",
    systemPrompt = "",
    history = [],
    userMessage = "",
    mode = "scenario",
  } = body;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      reply: mockReply(scenarioId),
      mock: true,
    });
  }

  const fullSystem = buildSystemPrompt(systemPrompt, mode);
  const messages: ChatMessage[] = [
    { role: "system", content: fullSystem },
    ...history.slice(-10), // 直近10件のみコンテキストとして送信（コスト最適化）
    { role: "user", content: userMessage },
  ];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.85,
        max_tokens: 350,
        presence_penalty: 0.3,
      }),
    });
    if (!res.ok) {
      return NextResponse.json({
        reply: mockReply(scenarioId),
        error: `OpenAI ${res.status}`,
      });
    }
    const data = await res.json();
    const raw: string = data.choices[0]?.message?.content ?? "";
    const parsed = parseFeedback(raw);
    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({
      reply: mockReply(scenarioId),
      error: e.message,
    });
  }
}
