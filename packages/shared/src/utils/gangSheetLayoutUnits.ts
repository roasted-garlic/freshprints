/**
 * Converts between saved layout inches and on-screen pixels for the builder canvas.
 * Saved `gangSheetItem`/`gangSheet` records always store inches; pixels exist only for rendering.
 */
export function inchesToPixels(inches: number, pixelsPerInch: number): number {
  return inches * pixelsPerInch;
}

export function pixelsToInches(pixels: number, pixelsPerInch: number): number {
  return pixels / pixelsPerInch;
}

export interface RectInches {
  xInches: number;
  yInches: number;
  widthInches: number;
  heightInches: number;
}

/**
 * Resizes a rect from a corner-drag delta (in inches), preserving aspect ratio by default —
 * matching the Slice 1 requirement that resize keeps aspect ratio unless explicitly disabled.
 */
export function resizeRectPreservingAspectRatio(
  rect: RectInches,
  deltaWidthInches: number,
  options: { preserveAspectRatio?: boolean; minSizeInches?: number } = {},
): RectInches {
  const preserveAspectRatio = options.preserveAspectRatio ?? true;
  const minSizeInches = options.minSizeInches ?? 0.25;
  const aspectRatio = rect.widthInches / rect.heightInches;

  const nextWidthInches = Math.max(minSizeInches, rect.widthInches + deltaWidthInches);
  const nextHeightInches = preserveAspectRatio
    ? Math.max(minSizeInches, nextWidthInches / aspectRatio)
    : rect.heightInches;

  return {
    xInches: rect.xInches,
    yInches: rect.yInches,
    widthInches: nextWidthInches,
    heightInches: nextHeightInches,
  };
}

/**
 * Clamps a rect's position so it never starts off the negative edge of the sheet. Does not
 * enforce the far edge — the `<Rnd>` canvas item's own `bounds="parent"` prop enforces
 * containment interactively; this is used for programmatic placement (e.g. initial placement
 * search) where no `<Rnd>` instance is involved yet.
 */
export function clampRectToSheetOrigin(rect: RectInches): RectInches {
  return {
    ...rect,
    xInches: Math.max(0, rect.xInches),
    yInches: Math.max(0, rect.yInches),
  };
}

/**
 * Swaps width/height for a 90°/270° rotation so the stored rect matches what a 90°-increment-only
 * rotation model expects: the box itself stays axis-aligned in storage (matching the reference
 * builder's approach), and only the rendered image content visually rotates via CSS. Re-centers
 * the swapped box on the original rect's center so rotating in place does not shift the item.
 */
export function rotateRectByCardinalDegrees(rect: RectInches, rotationDegrees: number): RectInches {
  const normalizedDegrees = ((rotationDegrees % 360) + 360) % 360;
  const isQuarterTurn = normalizedDegrees === 90 || normalizedDegrees === 270;

  if (!isQuarterTurn) {
    return rect;
  }

  const centerXInches = rect.xInches + rect.widthInches / 2;
  const centerYInches = rect.yInches + rect.heightInches / 2;

  return {
    xInches: centerXInches - rect.heightInches / 2,
    yInches: centerYInches - rect.widthInches / 2,
    widthInches: rect.heightInches,
    heightInches: rect.widthInches,
  };
}
