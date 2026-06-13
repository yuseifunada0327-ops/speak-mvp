import Link from "next/link";
import { Mic, Headphones, BookOpen, Flame, Target, Trophy, Sparkles } from "lucide-react";
import vocabData from "@/data/vocabulary.json";
import listeningData from "@/data/listening.json";
import speakingData from "@/data/speaking.json";

export default function HomePage() {
  // モック統計
  const stats = {
    streakDays: 1,
    todayXp: 0,
    dailyGoal: 200,
    weeklyMinutes: 0,
  };

  const goalProgress = Math.min(100, Math.round((stats.todayXp / stats.dailyGoal) * 100));

  return (
    <main className="px-5 pb-6 pt-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">SpeakUp へようこそ 👋</p>
          <h1 className="text-2xl font-bold text-brand-dark">今日も学ぼう</h1>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5 text-orange-600">
          <Flame size={18} fill="currentColor" />
          <span className="font-bold">{stats.streakDays}</span>
          <span className="text-xs">日目</span>
        </div>
      </header>

      <section className="gradient-brand mb-5 rounded-2xl p-5 text-white shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={20} />
            <span className="font-semibold">今日の目標</span>
          </div>
          <span className="text-sm font-medium opacity-90">
            {stats.todayXp} / {stats.dailyGoal} XP
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${goalProgress}%` }}
          />
        </div>
        <p className="mt-3 text-sm opacity-90">
          スピーキングで会話したり、語彙を覚えてXPを獲得しよう!
        </p>
      </section>

      {/* メイン機能：スピーキング (大きく強調) */}
      <section className="mb-5">
        <Link
          href="/speaking"
          className="card-hover relative block overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 p-5 text-white shadow-lg"
        >
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <Mic size={28} />
              </div>
              <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold backdrop-blur">
                <Sparkles size={10} className="inline mr-0.5" />
                MAIN
              </span>
            </div>
            <h2 className="mb-1 text-xl font-bold">スピーキング</h2>
            <p className="text-sm opacity-90">
              AI会話・発音採点・即時フィードバック
            </p>
            <div className="mt-3 flex items-center gap-3 text-xs opacity-90">
              <span>🎯 {speakingData.length}題</span>
              <span>🗣️ 意見主張モード</span>
              <span>📊 4軸スコア</span>
            </div>
          </div>
        </Link>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3">
        <Link
          href="/listening"
          className="card-hover rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green">
            <Headphones size={22} className="text-white" />
          </div>
          <h3 className="font-bold text-brand-dark">リスニング</h3>
          <p className="text-xs text-slate-500">ジャンル別・難易度順</p>
          <p className="mt-1 text-[11px] font-semibold text-brand-green">
            {listeningData.length}題
          </p>
        </Link>
        <Link
          href="/vocabulary"
          className="card-hover rounded-2xl border border-slate-200 bg-white p-4"
        >
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-orange">
            <BookOpen size={22} className="text-white" />
          </div>
          <h3 className="font-bold text-brand-dark">語彙学習</h3>
          <p className="text-xs text-slate-500">英検3級〜準1級</p>
          <p className="mt-1 text-[11px] font-semibold text-brand-orange">
            {vocabData.length}語 (SRS)
          </p>
        </Link>
      </section>

      <section className="mb-2 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2 text-slate-700">
          <Trophy size={18} />
          <span className="text-sm font-semibold">今週の活動</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xl font-extrabold text-brand-blue">
              {stats.weeklyMinutes}
            </p>
            <p className="text-[10px] text-slate-500">分</p>
          </div>
          <div>
            <p className="text-xl font-extrabold text-brand-green">0</p>
            <p className="text-[10px] text-slate-500">会話</p>
          </div>
          <div>
            <p className="text-xl font-extrabold text-brand-orange">0</p>
            <p className="text-[10px] text-slate-500">単語</p>
          </div>
        </div>
      </section>
    </main>
  );
}
