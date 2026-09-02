/**
 * Count how many Algolia hits were discarded after Firestore hydrate + consistency filters.
 * `hitCount` is the Algolia page window (pagination authority); `keptCount` is UI-ready designs.
 */
export function countManagedSearchDroppedHits(hitCount: number, keptCount: number): number {
  return Math.max(0, hitCount - keptCount);
}
