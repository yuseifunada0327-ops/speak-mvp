"use client";

/**
 * ジャンルタブ + 難易度フィルタの共通コンポーネント
 */
type GenreOption = { value: string; label: string; count?: number };
type LevelOption = "all" | "A2" | "B1" | "B2" | "C1";

export function GenreTabs({
  genres,
  selected,
  onSelect,
}: {
  genres: GenreOption[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="-mx-5 mb-3 overflow-x-auto px-5">
      <div className="flex gap-2 pb-1">
        {genres.map((g) => (
          <button
            key={g.value}
            onClick={() => onSelect(g.value)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              selected === g.value
                ? "bg-brand-dark text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {g.label}
            {typeof g.count === "number" && (
              <span className="ml-1 opacity-70">({g.count})</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function LevelFilter({
  selected,
  onSelect,
}: {
  selected: LevelOption;
  onSelect: (v: LevelOption) => void;
}) {
  const levels: { v: LevelOption; label: string; color: string }[] = [
    { v: "all", label: "すべて", color: "bg-slate-100 text-slate-700" },
    { v: "A2", label: "A2 / 3級", color: "bg-green-100 text-green-700" },
    { v: "B1", label: "B1 / 準2級", color: "bg-blue-100 text-blue-700" },
    { v: "B2", label: "B2 / 2級", color: "bg-orange-100 text-orange-700" },
    { v: "C1", label: "C1 / 準1級", color: "bg-red-100 text-red-700" },
  ];
  return (
    <div className="-mx-5 mb-4 overflow-x-auto px-5">
      <div className="flex gap-2 pb-1">
        {levels.map((l) => (
          <button
            key={l.v}
            onClick={() => onSelect(l.v)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
              selected === l.v
                ? "ring-2 ring-brand-blue ring-offset-1 " + l.color
                : l.color + " opacity-60 hover:opacity-100"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export const LEVEL_COLOR: Record<string, string> = {
  A2: "bg-green-100 text-green-700",
  B1: "bg-blue-100 text-blue-700",
  B2: "bg-orange-100 text-orange-700",
  C1: "bg-red-100 text-red-700",
};
