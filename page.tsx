"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Volume2, RotateCcw, Trophy } from "lucide-react";
import vocabData from "@/data/vocabulary.json";
import { calculateNextReview, initialSrsState, type ReviewQuality } from "@/lib/srs";
import { LevelFilter, LEVEL_COLOR } from "@/components/GenreLevelFilter";

type Vocab = (typeof vocabData)[number];

export default function VocabularyPage() {
  const [level, setLevel] = useState<"all" | "A2" | "B1" | "B2" | "C1">("all");
  const [started, setStarted] = useState(false);

  if (!started) return <LevelPicker level={level} setLevel={setLevel} onStart={() => setStarted(true)} />;
  return <Study level={level} onExit={() => setStarted(false)} />;
}

function LevelPicker({
  level,
  setLevel,
  onStart,
}: {
  level: "all" | "A2" | "B1" | "B2" | "C1";
  setLevel: (l: any) => void;
  onStart: () => void;
}) {
  const all = vocabData as Vocab[];
  const counts: Record<string, number> = {
    all: all.length,
    A2: all.filter((v) => v.level === "A2").length,
    B1: all.filter((v) => v.level === "B1").length,
    B2: all.filter((v) => v.level === "B2").length,
    C1: all.filter((v) => v.level === "C1").length,
  };
  const filteredCount = level === "all" ? all.length : counts[level];

  const eikenMap: Record<string, string> = {
    A2: "3級",
    B1: "準2級",
    B2: "2級",
    C1: "準1級",
  };

  return (
    <main className="px-5 pb-6 pt-8">
      <header className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">語彙学習</h1>
          <p className="text-xs text-slate-500">
            英検3級〜準1級 / CEFR A2〜C1 / 全{all.length}語
          </p>
        </div>
      </header>

      <p className="mb-2 text-sm font-semibold text-slate-700">レベルを選択</p>
      <LevelFilter selected={level} onSelect={setLevel} />

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid grid-cols-2 gap-3">
          {(["A2", "B1", "B2", "C1"] as const).map((lv) => (
            <div
              key={lv}
              className={`rounded-xl p-3 ${LEVEL_COLOR[lv]} ${
                level === lv || level === "all" ? "" : "opacity-50"
              }`}
            >
              <div className="text-[10px] font-bold opacity-80">
                CEFR {lv} / 英検{eikenMap[lv]}
              </div>
              <div className="text-xl font-extrabold">{counts[lv]}語</div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onStart}
        className="w-full rounded-full bg-brand-orange py-3.5 font-bold text-white shadow-md hover:scale-[1.02] transition"
      >
        {filteredCount}語から学習開始 →
      </button>

      <div className="mt-4 rounded-xl bg-orange-50 p-3.5 text-xs text-orange-900">
        <p className="font-bold">💡 SRS（間隔反復学習）について</p>
        <p className="mt-1">
          Again/Hard/Good/Easy で評価すると、SM-2アルゴリズムで最適な復習日が自動計算されます。
        </p>
      </div>
    </main>
  );
}

function Study({
  level,
  onExit,
}: {
  level: "all" | "A2" | "B1" | "B2" | "C1";
  onExit: () => void;
}) {
  // 学習対象（最大20枚 / ランダムサンプル）
  const cards = useMemo(() => {
    const all = vocabData as Vocab[];
    const filtered = level === "all" ? all : all.filter((v) => v.level === level);
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(20, shuffled.length));
  }, [level]);

  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [done, setDone] = useState(false);
  const [reviewed, setReviewed] = useState<ReviewQuality[]>([]);

  if (cards.length === 0) {
    return (
      <main className="px-5 pt-8 text-center">
        <p>カードがありません</p>
        <button onClick={onExit} className="mt-4 rounded-full bg-brand-blue px-6 py-2 text-white">
          戻る
        </button>
      </main>
    );
  }

  const current = cards[idx];

  const handleReview = (q: ReviewQuality) => {
    calculateNextReview(initialSrsState, q); // 副作用なし、実装サンプル
    setReviewed([...reviewed, q]);
    if (idx + 1 >= cards.length) {
      setDone(true);
    } else {
      setIdx(idx + 1);
      setShowAnswer(false);
    }
  };

  const handleSpeak = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  };

  if (done) {
    const correct = reviewed.filter((q) => q === "good" || q === "easy").length;
    return (
      <main className="px-5 pt-8 text-center pb-20">
        <div className="mb-4 flex flex-col items-center">
          <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
            <Trophy size={40} className="text-brand-orange" />
          </div>
          <h2 className="text-2xl font-bold text-brand-dark">お疲れさま!</h2>
          <p className="text-sm text-slate-500">セッションを完了しました 🎉</p>
        </div>
        <div className="mb-6 grid grid-cols-3 gap-2">
          <Stat label="学習数" value={cards.length} color="text-brand-blue" />
          <Stat label="覚えた" value={correct} color="text-brand-green" />
          <Stat label="XP" value={cards.length * 10} color="text-brand-orange" />
        </div>
        <button
          onClick={onExit}
          className="w-full rounded-full bg-brand-blue py-3 font-semibold text-white"
        >
          レベル選択に戻る
        </button>
        <button
          onClick={() => {
            setIdx(0);
            setShowAnswer(false);
            setReviewed([]);
            setDone(false);
          }}
          className="mt-3 flex items-center gap-1 mx-auto text-sm text-slate-500"
        >
          <RotateCcw size={14} /> もう一度
        </button>
      </main>
    );
  }

  return (
    <main className="px-5 pb-6 pt-8">
      <header className="mb-3 flex items-center gap-3">
        <button
          onClick={onExit}
          className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-brand-dark">語彙学習</h1>
          <p className="text-xs text-slate-500">
            {idx + 1} / {cards.length} 枚
          </p>
        </div>
      </header>

      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-brand-orange transition-all duration-300"
          style={{ width: `${((idx + 1) / cards.length) * 100}%` }}
        />
      </div>

      <section className="mb-5 min-h-[360px] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex gap-1.5">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                LEVEL_COLOR[current.level]
              }`}
            >
              {current.level}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              英検{current.eiken}
            </span>
            <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-600">
              {current.pos}
            </span>
          </div>
          <button
            onClick={() => handleSpeak(current.word)}
            className="rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
          >
            <Volume2 size={18} />
          </button>
        </div>

        <div className="mt-6 text-center">
          <h2 className="mb-2 text-3xl font-extrabold text-brand-dark">
            {current.word}
          </h2>
          <p className="text-slate-500">{current.phonetic}</p>
        </div>

        {showAnswer ? (
          <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-slate-400">
                意味
              </p>
              <p className="text-lg font-semibold text-brand-dark">
                {current.meaning}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-slate-400">
                例文
              </p>
              <p className="italic text-brand-dark">{current.example}</p>
              <p className="mt-1 text-sm text-slate-500">{current.exampleJa}</p>
              <button
                onClick={() => handleSpeak(current.example)}
                className="mt-2 flex items-center gap-1 text-xs text-brand-blue"
              >
                <Volume2 size={12} /> 例文を聞く
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center justify-center py-8">
            <p className="mb-4 text-sm text-slate-400">
              意味を思い浮かべたら…
            </p>
            <button
              onClick={() => setShowAnswer(true)}
              className="rounded-full bg-brand-dark px-8 py-3 font-semibold text-white"
            >
              答えを見る
            </button>
          </div>
        )}
      </section>

      {showAnswer && (
        <section>
          <p className="mb-2 text-center text-xs text-slate-500">
            どのくらい覚えていた?
          </p>
          <div className="grid grid-cols-4 gap-2">
            <ReviewBtn label="Again" sub="忘れた" color="bg-red-500" onClick={() => handleReview("again")} />
            <ReviewBtn label="Hard" sub="難しい" color="bg-orange-500" onClick={() => handleReview("hard")} />
            <ReviewBtn label="Good" sub="普通" color="bg-brand-blue" onClick={() => handleReview("good")} />
            <ReviewBtn label="Easy" sub="簡単" color="bg-brand-green" onClick={() => handleReview("easy")} />
          </div>
        </section>
      )}
    </main>
  );
}

function ReviewBtn({
  label,
  sub,
  color,
  onClick,
}: {
  label: string;
  sub: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`${color} flex flex-col items-center rounded-xl py-3 text-white shadow transition hover:scale-105`}
    >
      <span className="text-xs font-bold">{label}</span>
      <span className="text-[10px] opacity-90">{sub}</span>
    </button>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] uppercase text-slate-400">{label}</p>
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
    </div>
  );
}
