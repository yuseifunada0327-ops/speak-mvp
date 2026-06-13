"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  Eye,
  EyeOff,
  Check,
  Volume2,
} from "lucide-react";
import listeningData from "@/data/listening.json";
import { speakText } from "@/lib/speaking-engine";
import { GenreTabs, LevelFilter, LEVEL_COLOR } from "@/components/GenreLevelFilter";

type ListeningItem = (typeof listeningData)[number];
type SubtitleMode = "both" | "en" | "none";

export default function ListeningPage() {
  const [item, setItem] = useState<ListeningItem | null>(null);

  if (!item) return <ListPicker onPick={setItem} />;
  return <Player item={item} onBack={() => setItem(null)} />;
}

function ListPicker({ onPick }: { onPick: (i: ListeningItem) => void }) {
  const [genre, setGenre] = useState("all");
  const [level, setLevel] = useState<"all" | "A2" | "B1" | "B2" | "C1">("all");

  const all = listeningData as ListeningItem[];
  const counts = all.reduce<Record<string, number>>((acc, x) => {
    acc[x.genre] = (acc[x.genre] || 0) + 1;
    return acc;
  }, {});
  const genreOrder = ["daily", "news", "business", "academic", "travel"];
  const genreSet = Array.from(new Set(all.map((x) => x.genre)));
  const sortedGenres = genreOrder.filter((g) => genreSet.includes(g));

  const filtered = all
    .filter((x) => genre === "all" || x.genre === genre)
    .filter((x) => level === "all" || x.level === level)
    .sort((a, b) => a.levelOrder - b.levelOrder || a.id.localeCompare(b.id));

  const genreTabs = [
    { value: "all", label: "すべて", count: all.length },
    ...sortedGenres.map((g) => ({
      value: g,
      label: all.find((x) => x.genre === g)?.genreLabel || g,
      count: counts[g],
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
          <h1 className="text-2xl font-bold text-brand-dark">リスニング</h1>
          <p className="text-xs text-slate-500">
            ジャンル別・難易度順の音声教材
          </p>
        </div>
      </header>

      <GenreTabs genres={genreTabs} selected={genre} onSelect={setGenre} />
      <LevelFilter selected={level} onSelect={setLevel} />

      <p className="mb-2 text-xs font-semibold text-slate-500">
        {filtered.length} 件・難易度順
      </p>

      <div className="space-y-2.5">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => onPick(c)}
            className="card-hover w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-left"
          >
            <div className="mb-1 flex items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  LEVEL_COLOR[c.level]
                }`}
              >
                {c.level}
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                {c.genreLabel}
              </span>
              <span className="ml-auto text-xs text-slate-400">
                {Math.floor(c.durationSec / 60)}:
                {String(c.durationSec % 60).padStart(2, "0")}
              </span>
            </div>
            <h3 className="font-bold text-brand-dark">{c.title}</h3>
            <p className="line-clamp-1 text-xs text-slate-500">{c.titleJa}</p>
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

function Player({
  item,
  onBack,
}: {
  item: ListeningItem;
  onBack: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1.0);
  const [subMode, setSubMode] = useState<SubtitleMode>("both");
  const [dictation, setDictation] = useState(false);
  const [dictInput, setDictInput] = useState("");
  const [dictResult, setDictResult] = useState<"ok" | "ng" | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsUrlRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  // クリーンアップ
  useEffect(() => {
    return () => {
      stopAudio();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAudio = () => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    if (ttsUrlRef.current) {
      URL.revokeObjectURL(ttsUrlRef.current);
      ttsUrlRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const handlePlay = async () => {
    if (playing) {
      setPlaying(false);
      stopAudio();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    setPlaying(true);
    // OpenAI TTS を試す
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: item.transcript }),
      });
      if (res.ok && (res.headers.get("content-type") || "").includes("audio")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        ttsUrlRef.current = url;
        const audio = new Audio(url);
        audio.playbackRate = speed;
        ttsAudioRef.current = audio;
        audio.onended = () => {
          setPlaying(false);
          setProgress(100);
        };
        audio.ontimeupdate = () => {
          if (audio.duration) {
            setProgress((audio.currentTime / audio.duration) * 100);
          }
        };
        await audio.play();
        return;
      }
    } catch {
      // フォールバックへ
    }

    // Web Speech API フォールバック
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(item.transcript);
      u.lang = "en-US";
      u.rate = speed * 0.95;
      const voices = window.speechSynthesis.getVoices();
      const v =
        voices.find((x) => x.name.includes("Google") && x.lang.startsWith("en")) ||
        voices.find((x) => x.lang.startsWith("en-US"));
      if (v) u.voice = v;
      u.onend = () => {
        setPlaying(false);
        setProgress(100);
      };
      window.speechSynthesis.speak(u);

      // 進捗バー（疑似）
      const total = (item.transcript.length / 12) * 1000;
      const start = Date.now();
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - start;
        setProgress(Math.min(100, (elapsed / total) * 100));
      }, 100);
    }
  };

  const handleReset = () => {
    stopAudio();
    setPlaying(false);
    setProgress(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleDictation = () => {
    const userW = dictInput.toLowerCase().replace(/[.,!?'"]/g, "").split(/\s+/);
    const correctW = item.transcript
      .toLowerCase()
      .replace(/[.,!?'"]/g, "")
      .split(/\s+/);
    const matched = userW.filter((w) => correctW.includes(w)).length;
    const ratio = matched / correctW.length;
    setDictResult(ratio >= 0.6 ? "ok" : "ng");
  };

  return (
    <main className="px-5 pb-6 pt-8">
      <header className="mb-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="truncate font-bold text-brand-dark">{item.title}</h2>
          <p className="truncate text-xs text-slate-500">
            {item.titleJa} ・ {item.genreLabel}
          </p>
        </div>
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${
            LEVEL_COLOR[item.level]
          }`}
        >
          {item.level}
        </span>
      </header>

      {/* プレイヤー */}
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex h-16 items-center justify-center gap-1">
          {Array.from({ length: 32 }).map((_, i) => {
            const isPast = (i / 32) * 100 < progress;
            const h = 20 + Math.abs(Math.sin(i * 0.7)) * 32;
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition ${
                  isPast ? "bg-brand-green" : "bg-slate-200"
                }`}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-brand-green transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleReset}
            className="rounded-full p-3 text-slate-600 hover:bg-slate-100"
          >
            <RotateCcw size={22} />
          </button>
          <button
            onClick={handlePlay}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-green text-white shadow-lg transition hover:scale-105"
          >
            {playing ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
          </button>
          <button
            onClick={() => {
              const idx = speeds.indexOf(speed);
              const next = speeds[(idx + 1) % speeds.length];
              setSpeed(next);
              if (ttsAudioRef.current) ttsAudioRef.current.playbackRate = next;
            }}
            className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <Gauge size={16} />
            {speed}x
          </button>
        </div>
      </section>

      {/* 字幕モード */}
      <section className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">字幕表示</span>
          <button
            onClick={() => setDictation(!dictation)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              dictation
                ? "bg-brand-orange text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            ディクテーション {dictation ? "ON" : "OFF"}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["both", "en", "none"] as SubtitleMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setSubMode(mode)}
              className={`flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold ${
                subMode === mode
                  ? "bg-brand-blue text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {mode === "none" ? <EyeOff size={14} /> : <Eye size={14} />}
              {mode === "both" ? "英+和" : mode === "en" ? "英のみ" : "なし"}
            </button>
          ))}
        </div>
      </section>

      {/* スクリプト or ディクテーション */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        {dictation ? (
          <>
            <p className="mb-2 text-sm font-semibold text-brand-dark">
              聞き取った内容を英語で入力
            </p>
            <textarea
              value={dictInput}
              onChange={(e) => setDictInput(e.target.value)}
              placeholder="Type what you hear..."
              rows={4}
              className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-brand-blue focus:outline-none"
            />
            <button
              onClick={handleDictation}
              disabled={!dictInput.trim()}
              className="mt-3 w-full rounded-full bg-brand-orange py-2.5 font-semibold text-white disabled:opacity-40"
            >
              答え合わせ
            </button>
            {dictResult && (
              <div
                className={`mt-3 rounded-lg p-3 text-sm ${
                  dictResult === "ok"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                <p className="flex items-center gap-1 font-semibold">
                  {dictResult === "ok" ? (
                    <>
                      <Check size={16} /> よくできました!
                    </>
                  ) : (
                    "もう一度挑戦してみよう"
                  )}
                </p>
                <p className="mt-2 text-xs font-normal text-slate-600">
                  正解: {item.transcript}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            {subMode !== "none" && (
              <p className="text-base leading-relaxed text-brand-dark">
                {item.transcript}
              </p>
            )}
            {subMode === "both" && (
              <p className="border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-500">
                {item.transcriptJa}
              </p>
            )}
            {subMode === "none" && (
              <p className="py-8 text-center text-sm text-slate-400">
                字幕は非表示です。耳だけで集中して聞きましょう。
              </p>
            )}
            <button
              onClick={() => speakText(item.transcript, speed).catch(() => {})}
              className="mt-2 flex items-center gap-1 text-xs text-brand-blue"
            >
              <Volume2 size={12} /> もう一度聞く
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
