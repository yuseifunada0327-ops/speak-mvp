"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mic,
  Send,
  Bot,
  User as UserIcon,
  Volume2,
  Lightbulb,
  CheckCircle2,
  Sparkles,
  X,
} from "lucide-react";
import speakingData from "@/data/speaking.json";
import {
  AudioRecorder,
  transcribeAudio,
  chatWithAI,
  scorePronunciation,
  speakText,
  type ChatMessage,
  type PronunciationScore,
  type SpeakingFeedback,
} from "@/lib/speaking-engine";
import { PronunciationScoreCard } from "@/components/PronunciationScoreCard";
import { GenreTabs, LevelFilter, LEVEL_COLOR } from "@/components/GenreLevelFilter";

type Scenario = (typeof speakingData)[number];

type UIMessage = {
  role: "user" | "assistant";
  content: string;
  pronunciation?: PronunciationScore;
  corrections?: string[];
  betterPhrasing?: string;
  encouragement?: string;
};

export default function SpeakingPage() {
  const [scenario, setScenario] = useState<Scenario | null>(null);

  if (!scenario) {
    return <ScenarioPicker onPick={setScenario} />;
  }
  return (
    <ConversationView
      scenario={scenario}
      onBack={() => setScenario(null)}
    />
  );
}

// =========================================================
// シナリオ選択画面
// =========================================================
function ScenarioPicker({ onPick }: { onPick: (s: Scenario) => void }) {
  const [genre, setGenre] = useState<string>("all");
  const [level, setLevel] = useState<"all" | "A2" | "B1" | "B2" | "C1">("all");

  const allItems = speakingData as Scenario[];

  const genreCounts = allItems.reduce<Record<string, number>>((acc, x) => {
    acc[x.genre] = (acc[x.genre] || 0) + 1;
    return acc;
  }, {});

  // ジャンル: opinion を最後にして並べる
  const genreOrder = ["daily", "travel", "business", "academic", "service", "social", "opinion"];
  const genreSet = Array.from(new Set(allItems.map((x) => x.genre)));
  const sortedGenres = genreOrder.filter((g) => genreSet.includes(g));

  const filtered = allItems
    .filter((x) => genre === "all" || x.genre === genre)
    .filter((x) => level === "all" || x.level === level)
    .sort(
      (a, b) =>
        a.levelOrder - b.levelOrder ||
        a.genre.localeCompare(b.genre) ||
        a.id.localeCompare(b.id)
    );

  const genreTabs = [
    { value: "all", label: "すべて", count: allItems.length },
    ...sortedGenres.map((g) => ({
      value: g,
      label: allItems.find((x) => x.genre === g)?.genreLabel || g,
      count: genreCounts[g],
    })),
  ];

  return (
    <main className="px-5 pb-6 pt-8">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href="/"
          className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">スピーキング</h1>
          <p className="text-xs text-slate-500">
            AIと話そう・発音採点・即時フィードバック
          </p>
        </div>
      </header>

      <GenreTabs genres={genreTabs} selected={genre} onSelect={setGenre} />
      <LevelFilter selected={level} onSelect={setLevel} />

      <p className="mb-2 text-xs font-semibold text-slate-500">
        {filtered.length} 件・難易度順
      </p>

      <div className="space-y-2.5">
        {filtered.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s)}
            className="card-hover flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left"
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${
                s.type === "opinion"
                  ? "bg-purple-50"
                  : "bg-blue-50"
              }`}
            >
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="mb-0.5 flex items-center gap-1.5">
                <h3 className="truncate font-bold text-brand-dark">
                  {s.title}
                </h3>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    LEVEL_COLOR[s.level]
                  }`}
                >
                  {s.level}
                </span>
                {s.type === "opinion" && (
                  <span className="shrink-0 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                    意見主張
                  </span>
                )}
              </div>
              <p className="line-clamp-1 text-xs text-slate-500">
                {s.description}
              </p>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">
            該当する教材がありません
          </p>
        )}
      </div>
    </main>
  );
}

// =========================================================
// 会話画面
// =========================================================
function ConversationView({
  scenario,
  onBack,
}: {
  scenario: Scenario;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<UIMessage[]>([
    { role: "assistant", content: scenario.opener },
  ]);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const lastUserAudioRef = useRef<Blob | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // 初回 AI 挨拶を音声で再生（オプション）
  useEffect(() => {
    const t = setTimeout(() => speakText(scenario.opener).catch(() => {}), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartRecord = async () => {
    setError(null);
    try {
      recorderRef.current = new AudioRecorder();
      await recorderRef.current.start((a) => setAmplitude(a));
      setRecording(true);
    } catch (e: any) {
      setError(e.message || "録音を開始できませんでした");
    }
  };

  const handleStopRecord = async () => {
    if (!recorderRef.current) return;
    setRecording(false);
    setTranscribing(true);
    try {
      const blob = await recorderRef.current.stop();
      lastUserAudioRef.current = blob;
      const text = await transcribeAudio(blob);
      setInput(text);
      // 録音から自動送信
      if (text.trim()) {
        await sendMessage(text, blob);
      }
    } catch (e: any) {
      setError(e.message || "音声認識に失敗しました");
    } finally {
      setTranscribing(false);
    }
  };

  const handleCancelRecord = () => {
    recorderRef.current?.cancel();
    setRecording(false);
  };

  const sendMessage = async (text: string, audio?: Blob | null) => {
    const userMsg: UIMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // 発音採点 (音声がある場合のみ)
    let pron: PronunciationScore | undefined;
    if (audio) {
      try {
        pron = await scorePronunciation(audio, text);
        setMessages((prev) => {
          const next = [...prev];
          const lastUser = [...next].reverse().find((m) => m.role === "user");
          if (lastUser) lastUser.pronunciation = pron;
          return next;
        });
      } catch {
        // 採点失敗時はスキップ
      }
    }

    // AI 応答
    const history: ChatMessage[] = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const feedback: SpeakingFeedback = await chatWithAI(
        scenario.id,
        scenario.systemPrompt,
        history,
        text,
        scenario.type === "opinion" ? "opinion" : "scenario"
      );
      setMessages((prev) => {
        // ユーザーのフィードバックを直前のユーザーメッセージに紐付け
        const next = [...prev];
        const lastUser = [...next].reverse().find((m) => m.role === "user");
        if (lastUser) {
          lastUser.corrections = feedback.corrections;
          lastUser.betterPhrasing = feedback.betterPhrasing;
          lastUser.encouragement = feedback.encouragement;
        }
        return [
          ...next,
          { role: "assistant", content: feedback.reply },
        ];
      });
      // AI 応答を音声化
      speakText(feedback.reply).catch(() => {});
    } catch (e: any) {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleTextSend = () => {
    if (!input.trim() || loading) return;
    sendMessage(input.trim(), null);
  };

  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <button
          onClick={onBack}
          className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl">{scenario.icon}</span>
          <div className="min-w-0">
            <h2 className="truncate font-bold text-brand-dark">
              {scenario.title}
            </h2>
            <p className="truncate text-xs text-slate-500">
              {scenario.titleEn}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${
            LEVEL_COLOR[scenario.level]
          }`}
        >
          {scenario.level}
        </span>
      </header>

      {scenario.type === "opinion" && (
        <div className="bg-purple-50 px-4 py-2 text-xs text-purple-800">
          🗣️ <strong>意見主張モード</strong>: AIは反対意見を取って議論を引き出します
        </div>
      )}

      {/* メッセージリスト */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3 pb-2">
          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}
          {(loading || transcribing) && (
            <div className="flex gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white">
                <Bot size={16} />
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3">
                <div className="flex gap-1">
                  <Dot delay={0} />
                  <Dot delay={150} />
                  <Dot delay={300} />
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-red-50 px-4 py-2 text-xs text-red-700">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* 入力エリア */}
      <div className="border-t border-slate-200 bg-white px-4 py-3 pb-20">
        {recording ? (
          <RecordingBar
            amplitude={amplitude}
            onStop={handleStopRecord}
            onCancel={handleCancelRecord}
          />
        ) : (
          <div className="flex items-end gap-2">
            <button
              onClick={handleStartRecord}
              disabled={loading || transcribing}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white shadow-md transition hover:scale-105 disabled:opacity-40"
              aria-label="音声入力"
            >
              <Mic size={20} />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTextSend()}
              placeholder="マイクで話す or 英語で入力..."
              disabled={loading}
              className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-blue focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={handleTextSend}
              disabled={!input.trim() || loading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-green text-white transition disabled:opacity-40"
              aria-label="送信"
            >
              <Send size={18} />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

// =========================================================
// メッセージバブル
// =========================================================
function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-brand-green text-white" : "bg-brand-blue text-white"
        }`}
      >
        {isUser ? <UserIcon size={16} /> : <Bot size={16} />}
      </div>
      <div
        className={`max-w-[78%] space-y-2 ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`relative rounded-2xl px-4 py-2.5 text-sm ${
            isUser ? "bg-brand-blue text-white" : "bg-slate-100 text-brand-dark"
          }`}
        >
          {message.content}
          {!isUser && (
            <button
              onClick={() => speakText(message.content).catch(() => {})}
              className="absolute -bottom-2 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-500 shadow ring-1 ring-slate-200 hover:text-brand-blue"
              aria-label="読み上げ"
            >
              <Volume2 size={11} />
            </button>
          )}
        </div>

        {/* 発音スコア */}
        {isUser && message.pronunciation && (
          <PronunciationScoreCard score={message.pronunciation} />
        )}

        {/* 文法・語彙の訂正 */}
        {isUser && message.corrections && message.corrections.length > 0 && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-2.5">
            <div className="mb-1 flex items-center gap-1 text-[11px] font-bold text-orange-700">
              <Sparkles size={12} /> 改善ポイント
            </div>
            <ul className="space-y-1">
              {message.corrections.map((c, i) => (
                <li key={i} className="text-xs text-orange-900">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* より自然な言い回し */}
        {isUser && message.betterPhrasing && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-900">
            <div className="mb-0.5 flex items-center gap-1 text-[11px] font-bold text-blue-700">
              <Lightbulb size={12} /> もっと自然に
            </div>
            {message.betterPhrasing}
          </div>
        )}

        {/* 励まし */}
        {isUser && message.encouragement && (
          <div className="rounded-xl bg-green-50 p-2 text-xs text-green-800">
            <div className="flex items-center gap-1">
              <CheckCircle2 size={12} /> {message.encouragement}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================
// 録音バー (波形表示付き)
// =========================================================
function RecordingBar({
  amplitude,
  onStop,
  onCancel,
}: {
  amplitude: number;
  onStop: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-full bg-red-50 px-3 py-2">
      <button
        onClick={onCancel}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-red-500 shadow"
        aria-label="キャンセル"
      >
        <X size={18} />
      </button>
      <div className="flex flex-1 items-center justify-center gap-0.5">
        {Array.from({ length: 24 }).map((_, i) => {
          const seed = Math.sin(i * 0.7);
          const h = 6 + Math.abs(seed) * 18 + amplitude * 32 * Math.random();
          return (
            <div
              key={i}
              className="w-1 rounded-full bg-red-400 transition-all"
              style={{ height: `${Math.min(40, h)}px` }}
            />
          );
        })}
      </div>
      <span className="text-xs font-semibold text-red-600">録音中</span>
      <button
        onClick={onStop}
        className="mic-pulse relative flex h-11 w-11 items-center justify-center rounded-full bg-red-500 text-white"
        aria-label="送信"
      >
        <Send size={18} />
      </button>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-2 w-2 animate-bounce rounded-full bg-slate-400"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
