/**
 * Pure helper for designs.favoriteCount updates (Cloud Functions + tests).
 */
export function nextFavoriteCountAfterDelta(
  current: number | undefined,
  delta: 1 | -1,
): number {
  const base =
    typeof current === "number" && Number.isFinite(current) ? Math.max(0, Math.floor(current)) : 0;
  return Math.max(0, base + delta);
}
