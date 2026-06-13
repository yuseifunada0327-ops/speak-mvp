"use client";

import type { PronunciationScore } from "@/lib/speaking-engine";

export function PronunciationScoreCard({
  score,
  compact = false,
}: {
  score: PronunciationScore;
  compact?: boolean;
}) {
  const colorOf = (n: number) =>
    n >= 90
      ? "text-green-600"
      : n >= 75
        ? "text-yellow-600"
        : n >= 60
          ? "text-orange-600"
          : "text-red-500";
  const bgOf = (n: number) =>
    n >= 90
      ? "bg-green-500"
      : n >= 75
        ? "bg-yellow-500"
        : n >= 60
          ? "bg-orange-500"
          : "bg-red-500";

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold shadow-sm">
        <span className={colorOf(score.overall)}>{score.overall}</span>
        <span className="text-slate-400">/100</span>
      </div>
    );
  }

  const axes: { label: string; value: number; desc: string }[] = [
    { label: "正確性", value: score.accuracy, desc: "音素の正確さ" },
    { label: "流暢性", value: score.fluency, desc: "発話速度・ポーズ" },
    { label: "完全性", value: score.completeness, desc: "発話の網羅性" },
    { label: "韻律", value: score.prosody, desc: "リズム・抑揚" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">発音スコア</span>
        <div className={`text-2xl font-extrabold ${colorOf(score.overall)}`}>
          {score.overall}
          <span className="ml-0.5 text-xs font-medium text-slate-400">
            /100
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {axes.map((a) => (
          <div key={a.label} className="rounded-lg bg-slate-50 p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-600">
                {a.label}
              </span>
              <span className={`text-xs font-bold ${colorOf(a.value)}`}>
                {a.value}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full ${bgOf(a.value)}`}
                style={{ width: `${a.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
