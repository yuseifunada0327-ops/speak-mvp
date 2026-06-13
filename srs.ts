/**
 * SM-2アルゴリズム実装（Ankiと同様の間隔反復学習）
 * https://en.wikipedia.org/wiki/SuperMemo#Description_of_SM-2_algorithm
 *
 * quality: 0 (完全に忘れた) 〜 5 (完璧)
 * - Again = 0, Hard = 2, Good = 4, Easy = 5
 */

export type ReviewQuality = "again" | "hard" | "good" | "easy";

export interface SrsState {
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
}

const qualityScore: Record<ReviewQuality, number> = {
  again: 0,
  hard: 2,
  good: 4,
  easy: 5,
};

export function calculateNextReview(
  current: SrsState,
  quality: ReviewQuality
): SrsState & { nextReviewAt: Date } {
  const q = qualityScore[quality];
  let { repetitions, easeFactor, intervalDays } = current;

  if (q < 3) {
    // 不正解 → 復習サイクルをリセット
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      intervalDays = 1;
    } else if (repetitions === 2) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
  }

  // EF（ease factor）の更新
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  );

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);

  return { repetitions, easeFactor, intervalDays, nextReviewAt };
}

export const initialSrsState: SrsState = {
  repetitions: 0,
  easeFactor: 2.5,
  intervalDays: 0,
};
