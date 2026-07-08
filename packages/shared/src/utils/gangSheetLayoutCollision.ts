import type { RectInches } from "./gangSheetLayoutUnits";

/**
 * Simple axis-aligned bounding-box overlap test, in inches. Rotation in the 90°-increment model
 * always swaps width/height in storage (see `rotateRectByCardinalDegrees`), so every stored rect
 * is already axis-aligned — no rotated-corner geometry is ever needed here.
 */
export function rectsOverlap(a: RectInches, b: RectInches): boolean {
  return (
    a.xInches < b.xInches + b.widthInches &&
    a.xInches + a.widthInches > b.xInches &&
    a.yInches < b.yInches + b.heightInches &&
    a.yInches + a.heightInches > b.yInches
  );
}

export interface PlacedRectWithId extends RectInches {
  id: string;
}

/**
 * True when a candidate rect would overlap any other placed item, excluding the item being
 * moved/resized itself.
 */
export function overlapsAnyOtherItem(
  candidate: RectInches,
  excludeItemId: string,
  otherItems: PlacedRectWithId[],
): boolean {
  return otherItems.some((item) => item.id !== excludeItemId && rectsOverlap(candidate, item));
}
