export interface NestableBox {
  id: string;
  widthPx: number;
  heightPx: number;
}

/**
 * Interleaves groups of items round-robin (index 0 of every group, then index 1 of every group,
 * etc., skipping groups once exhausted) instead of concatenating each group in full before the
 * next. Used to spread duplicate copies of the same design apart in the nesting input: since
 * `nestBoxesIntoShelves`'s sort-by-height is stable, items adjacent in the input stay adjacent as
 * row candidates when tied in height — grouping copies consecutively would always offer the
 * packer "two of the same design" as its first same-height row pairing, never a chance to pair
 * different designs whose combined rotated width might fit the sheet better.
 */
export function interleaveGroups<T>(groups: T[][]): T[] {
  const interleaved: T[] = [];
  const maxGroupLength = Math.max(0, ...groups.map((group) => group.length));

  for (let index = 0; index < maxGroupLength; index += 1) {
    for (const group of groups) {
      if (index < group.length) {
        interleaved.push(group[index]);
      }
    }
  }

  return interleaved;
}

export interface NestedPlacement {
  id: string;
  x: number;
  y: number;
  /** True when this placement's image must be rotated 90° to match the swapped width/height used for layout. */
  rotated: boolean;
}

export interface NestingSpacingPx {
  /** Sheet edge to nearest image, left/right only. */
  sideMarginPx: number;
  /** Sheet edge to nearest image, top/bottom only. */
  topBottomMarginPx: number;
  /** Image-to-image spacing, both between images in a row and between rows. */
  gutterPx: number;
}

export interface NestResult {
  placements: NestedPlacement[];
  sheetHeightPx: number;
  skipped: { id: string; reason: "too_wide_for_sheet" }[];
}

interface RowBox extends NestableBox {
  /** Original (pre-rotation) dimensions, kept so rotation decisions always use the true shape. */
  originalWidthPx: number;
  originalHeightPx: number;
}

/**
 * Decides the final orientation of every box in a completed row. A portrait box (taller than
 * wide) is rotated whenever doing so would reduce the row's overall height (i.e. the box is
 * currently the tallest, or tied for tallest, in the row) — generalizing the old "rotate a lone
 * box" rule (a lone box is always the row's tallest) to any row, since rotating a box that isn't
 * driving the row's height would only waste width for no benefit. Multiple boxes sharing a row
 * (e.g. two portrait images of equal height) can rotate together as long as their combined
 * rotated width — alongside the row's other boxes, using each box's *final* resolved width, not
 * just its original one — still fits within the usable width; rotating must never push another
 * box off-sheet. A lone box has no other row content to conflict with, so it always rotates when
 * portrait, matching the original unconditional lone-box rotation.
 */
function resolveRowRotations(rowBoxes: RowBox[], usableWidthPx: number, gutterPx: number): RowBox[] {
  const currentRowHeightPx = Math.max(...rowBoxes.map((box) => box.heightPx));
  const resolved: RowBox[] = rowBoxes.map((box) => ({ ...box }));

  for (const [index, box] of resolved.entries()) {
    const isPortrait = box.originalHeightPx > box.originalWidthPx;

    if (!isPortrait || box.heightPx < currentRowHeightPx) {
      continue;
    }

    const rotatedWidthPx = box.originalHeightPx;
    const rotatedHeightPx = box.originalWidthPx;

    if (rotatedHeightPx >= currentRowHeightPx) {
      continue;
    }

    if (resolved.length === 1) {
      resolved[index] = { ...box, widthPx: rotatedWidthPx, heightPx: rotatedHeightPx };
      continue;
    }

    const otherBoxesWidthPx = resolved.reduce(
      (sum, otherBox, otherIndex) => (otherIndex === index ? sum : sum + otherBox.widthPx),
      0,
    );
    const rowWidthWithRotationPx = otherBoxesWidthPx + rotatedWidthPx + gutterPx * (resolved.length - 1);

    if (rowWidthWithRotationPx <= usableWidthPx) {
      resolved[index] = { ...box, widthPx: rotatedWidthPx, heightPx: rotatedHeightPx };
    }
  }

  return resolved;
}

/**
 * Finalizes one shelf row: resolves each box's best orientation (see `resolveRowRotations`), then
 * lays out the row's boxes left-to-right, centered as a group within the usable width so leftover
 * space is split evenly on both sides rather than left-aligned against the side margin.
 */
function layoutRow(
  rowBoxes: RowBox[],
  rowY: number,
  usableWidthPx: number,
  sideMarginPx: number,
  gutterPx: number,
): { placements: NestedPlacement[]; rowHeightPx: number } {
  const boxes = resolveRowRotations(rowBoxes, usableWidthPx, gutterPx);

  const rowContentWidthPx = boxes.reduce((sum, box) => sum + box.widthPx, 0) + gutterPx * (boxes.length - 1);
  const rowStartX = sideMarginPx + Math.round((usableWidthPx - rowContentWidthPx) / 2);

  const placements: NestedPlacement[] = [];
  let cursorX = rowStartX;
  let rowHeightPx = 0;

  for (const box of boxes) {
    const rotated = box.widthPx !== box.originalWidthPx || box.heightPx !== box.originalHeightPx;
    placements.push({ id: box.id, x: cursorX, y: rowY, rotated });
    cursorX += box.widthPx + gutterPx;
    rowHeightPx = Math.max(rowHeightPx, box.heightPx);
  }

  return { placements, rowHeightPx };
}

/**
 * Packs boxes into shelf rows for gang sheet nesting: sorts tallest-first, greedily fills each
 * row left-to-right until the next box would exceed the sheet's usable width, then starts a new
 * row below. Row height is set by the tallest box in that row so every box in the row aligns to
 * a common bottom edge, which is what makes the result easy to cut in straight lines. Each
 * completed row is centered as a group within the usable width; any box driving the row's height
 * (a lone box, or one tied for tallest) is rotated when doing so shrinks the row and still fits.
 */
export function nestBoxesIntoShelves(
  boxes: NestableBox[],
  sheetWidthPx: number,
  spacing: NestingSpacingPx,
): NestResult {
  const usableWidthPx = sheetWidthPx - 2 * spacing.sideMarginPx;

  const skipped: { id: string; reason: "too_wide_for_sheet" }[] = [];
  const nestable: RowBox[] = [];

  for (const box of boxes) {
    if (box.widthPx > usableWidthPx) {
      skipped.push({ id: box.id, reason: "too_wide_for_sheet" });
    } else {
      nestable.push({ ...box, originalWidthPx: box.widthPx, originalHeightPx: box.heightPx });
    }
  }

  const sorted = [...nestable].sort((a, b) => b.heightPx - a.heightPx);

  const placements: NestedPlacement[] = [];
  let cursorY = spacing.topBottomMarginPx;
  let rowBoxes: RowBox[] = [];
  let rowWidthUsedPx = 0;

  function closeRow() {
    if (rowBoxes.length === 0) {
      return;
    }

    const { placements: rowPlacements, rowHeightPx } = layoutRow(
      rowBoxes,
      cursorY,
      usableWidthPx,
      spacing.sideMarginPx,
      spacing.gutterPx,
    );
    placements.push(...rowPlacements);
    cursorY += rowHeightPx + spacing.gutterPx;
    rowBoxes = [];
    rowWidthUsedPx = 0;
  }

  for (const box of sorted) {
    const isRowEmpty = rowBoxes.length === 0;
    const widthNeededPx = isRowEmpty ? box.widthPx : rowWidthUsedPx + spacing.gutterPx + box.widthPx;

    if (!isRowEmpty && widthNeededPx > usableWidthPx) {
      closeRow();
    }

    rowBoxes.push(box);
    rowWidthUsedPx = rowBoxes.length === 1 ? box.widthPx : rowWidthUsedPx + spacing.gutterPx + box.widthPx;
  }

  closeRow();
  cursorY -= placements.length > 0 ? spacing.gutterPx : 0;

  const sheetHeightPx = placements.length === 0 ? 0 : cursorY + spacing.topBottomMarginPx;

  return { placements, sheetHeightPx, skipped };
}

export interface NestedSheet {
  placements: NestedPlacement[];
  sheetHeightPx: number;
}

export interface MultiSheetNestResult {
  sheets: NestedSheet[];
  skipped: { id: string; reason: "too_wide_for_sheet" }[];
}

/**
 * Nests boxes the same way as `nestBoxesIntoShelves`, but starts a new sheet once a sheet's
 * running height would exceed `maxSheetHeightPx` — a single show with enough images could
 * otherwise produce one impractically tall canvas.
 */
export function nestBoxesIntoShelvesWithHeightCap(
  boxes: NestableBox[],
  sheetWidthPx: number,
  spacing: NestingSpacingPx,
  maxSheetHeightPx: number,
): MultiSheetNestResult {
  const usableWidthPx = sheetWidthPx - 2 * spacing.sideMarginPx;

  const skipped: { id: string; reason: "too_wide_for_sheet" }[] = [];
  const nestable: RowBox[] = [];

  for (const box of boxes) {
    if (box.widthPx > usableWidthPx) {
      skipped.push({ id: box.id, reason: "too_wide_for_sheet" });
    } else {
      nestable.push({ ...box, originalWidthPx: box.widthPx, originalHeightPx: box.heightPx });
    }
  }

  const sorted = [...nestable].sort((a, b) => b.heightPx - a.heightPx);

  const sheets: NestedSheet[] = [];
  let placements: NestedPlacement[] = [];
  let cursorY = spacing.topBottomMarginPx;
  let rowBoxes: RowBox[] = [];
  let rowWidthUsedPx = 0;

  function closeRow() {
    if (rowBoxes.length === 0) {
      return;
    }

    const { placements: rowPlacements, rowHeightPx } = layoutRow(
      rowBoxes,
      cursorY,
      usableWidthPx,
      spacing.sideMarginPx,
      spacing.gutterPx,
    );
    placements.push(...rowPlacements);
    cursorY += rowHeightPx + spacing.gutterPx;
    rowBoxes = [];
    rowWidthUsedPx = 0;

    return rowHeightPx;
  }

  function finishSheet() {
    if (placements.length === 0) {
      return;
    }

    const sheetHeightPx = cursorY - spacing.gutterPx + spacing.topBottomMarginPx;
    sheets.push({ placements, sheetHeightPx });
    placements = [];
    cursorY = spacing.topBottomMarginPx;
  }

  for (const box of sorted) {
    const isRowEmpty = rowBoxes.length === 0;
    const widthNeededPx = isRowEmpty ? box.widthPx : rowWidthUsedPx + spacing.gutterPx + box.widthPx;

    if (!isRowEmpty && widthNeededPx > usableWidthPx) {
      // Peek at whether the pending row plus a next row for `box` would exceed the height cap.
      // Both rows' heights need to reflect their *actual* post-rotation height, not raw
      // pre-rotation height, otherwise a row/box that would comfortably rotate to fit the current
      // sheet could be wrongly pushed to a new one. `box` will start the next row alone, and a
      // lone portrait box always rotates (see `resolveRowRotations`), so its best-fit height is
      // used the same way; the pending row is resolved via the same function used at row-close.
      const isPortrait = box.heightPx > box.widthPx;
      const fitsRotated = isPortrait && box.heightPx <= usableWidthPx;
      const nextRowBoxHeightPx = fitsRotated ? Math.min(box.heightPx, box.widthPx) : box.heightPx;

      const resolvedPendingRow = resolveRowRotations(rowBoxes, usableWidthPx, spacing.gutterPx);
      const pendingRowHeightPx = Math.max(...resolvedPendingRow.map((rowBox) => rowBox.heightPx));
      const nextRowY = cursorY + pendingRowHeightPx + spacing.gutterPx;
      const nextRowBottomY = nextRowY + nextRowBoxHeightPx + spacing.topBottomMarginPx;

      if (nextRowBottomY > maxSheetHeightPx) {
        closeRow();
        finishSheet();
      } else {
        closeRow();
      }
    }

    rowBoxes.push(box);
    rowWidthUsedPx = rowBoxes.length === 1 ? box.widthPx : rowWidthUsedPx + spacing.gutterPx + box.widthPx;
  }

  closeRow();
  finishSheet();

  return { sheets, skipped };
}
