export interface NestableBox {
  id: string;
  widthPx: number;
  heightPx: number;
}

/**
 * Bump when the deterministic shelf-packing algorithm changes in a way that can alter cached
 * gang-sheet output.
 */
export const GANG_SHEET_NESTING_ALGORITHM_VERSION = 2;

const MAX_ORIENTATION_CANDIDATES = 32;

/**
 * Interleaves groups of items round-robin (index 0 of every group, then index 1 of every group,
 * etc., skipping groups once exhausted) instead of concatenating each group in full before the
 * next. Used to spread duplicate copies of the same design apart in the nesting input: since
 * `nestBoxesIntoShelves`'s sort-by-height is stable, items adjacent in the input stay adjacent as
 * row candidates when tied in height.
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
  /** Original (pre-rotation) dimensions, kept so orientation decisions use the true shape. */
  originalWidthPx: number;
  originalHeightPx: number;
  /** Stable input position used after the original-height sort. */
  inputOrder: number;
}

interface RowOrientationPlan {
  boxes: RowBox[];
  rotated: boolean[];
  rowWidthPx: number;
  rowHeightPx: number;
  rotationCount: number;
  patternKey: string;
}

interface InternalNestedSheet {
  placements: NestedPlacement[];
  sheetHeightPx: number;
}

interface InternalNestResult {
  sheets: InternalNestedSheet[];
  skipped: { id: string; reason: "too_wide_for_sheet" }[];
  rowCount: number;
  rotationCount: number;
}

function compareStableHeight(left: RowBox, right: RowBox): number {
  return right.originalHeightPx - left.originalHeightPx || left.inputOrder - right.inputOrder;
}

function buildRowPlan(
  rowBoxes: RowBox[],
  rotated: boolean[],
  gutterPx: number,
): RowOrientationPlan {
  const boxes = rowBoxes.map((box, index) => {
    const useRotation = Boolean(rotated[index]) && box.originalWidthPx !== box.originalHeightPx;
    return {
      ...box,
      widthPx: useRotation ? box.originalHeightPx : box.originalWidthPx,
      heightPx: useRotation ? box.originalWidthPx : box.originalHeightPx,
    };
  });
  const rowWidthPx = boxes.reduce((sum, box) => sum + box.widthPx, 0) + gutterPx * Math.max(0, boxes.length - 1);
  const rowHeightPx = Math.max(0, ...boxes.map((box) => box.heightPx));
  const resolvedRotations = boxes.map(
    (box, index) => box.widthPx !== rowBoxes[index]!.originalWidthPx || box.heightPx !== rowBoxes[index]!.originalHeightPx,
  );

  return {
    boxes,
    rotated: resolvedRotations,
    rowWidthPx,
    rowHeightPx,
    rotationCount: resolvedRotations.filter(Boolean).length,
    patternKey: resolvedRotations.map((value) => (value ? "1" : "0")).join(""),
  };
}

function addOrientationCandidate(
  candidates: boolean[][],
  seen: Set<string>,
  pattern: boolean[],
): boolean {
  const key = pattern.map((value) => (value ? "1" : "0")).join("");
  if (seen.has(key)) {
    return candidates.length < MAX_ORIENTATION_CANDIDATES;
  }

  seen.add(key);
  if (candidates.length >= MAX_ORIENTATION_CANDIDATES) {
    return false;
  }

  candidates.push(pattern);
  return candidates.length < MAX_ORIENTATION_CANDIDATES;
}

/**
 * Returns the fixed, deterministic orientation candidate list required by the shelf heuristic.
 * It is intentionally capped so a row with many small boxes cannot turn orientation selection
 * into exponential search.
 */
function enumerateOrientationCandidates(rowBoxes: RowBox[], usableWidthPx: number): boolean[][] {
  const canRotate = rowBoxes.map(
    (box) => box.originalWidthPx !== box.originalHeightPx && box.originalHeightPx <= usableWidthPx,
  );
  const original = rowBoxes.map(() => false);
  const allRotated = canRotate.map(Boolean);
  const candidates: boolean[][] = [];
  const seen = new Set<string>();

  if (!addOrientationCandidate(candidates, seen, original)) {
    return candidates;
  }
  if (!addOrientationCandidate(candidates, seen, allRotated)) {
    return candidates;
  }

  for (let index = 0; index < rowBoxes.length; index += 1) {
    if (!canRotate[index]) {
      continue;
    }
    const singleFlip = [...original];
    singleFlip[index] = true;
    if (!addOrientationCandidate(candidates, seen, singleFlip)) {
      return candidates;
    }
  }

  for (let index = 0; index < rowBoxes.length; index += 1) {
    if (!canRotate[index]) {
      continue;
    }
    const singleFlipBack = [...allRotated];
    singleFlipBack[index] = false;
    if (!addOrientationCandidate(candidates, seen, singleFlipBack)) {
      return candidates;
    }
  }

  for (let left = 0; left < rowBoxes.length; left += 1) {
    if (!canRotate[left]) {
      continue;
    }
    for (let right = left + 1; right < rowBoxes.length; right += 1) {
      if (!canRotate[right]) {
        continue;
      }
      const pairFlip = [...original];
      pairFlip[left] = true;
      pairFlip[right] = true;
      if (!addOrientationCandidate(candidates, seen, pairFlip)) {
        return candidates;
      }
    }
  }

  return candidates;
}

function compareRowPlans(left: RowOrientationPlan, right: RowOrientationPlan): number {
  return (
    left.rowHeightPx - right.rowHeightPx ||
    left.rotationCount - right.rotationCount ||
    left.rowWidthPx - right.rowWidthPx ||
    left.patternKey.localeCompare(right.patternKey)
  );
}

function selectOrientationPlan(
  rowBoxes: RowBox[],
  usableWidthPx: number,
  gutterPx: number,
): RowOrientationPlan | null {
  if (rowBoxes.length === 0) {
    return null;
  }

  const candidates = enumerateOrientationCandidates(rowBoxes, usableWidthPx);
  const plans = candidates
    .map((candidate) => buildRowPlan(rowBoxes, candidate, gutterPx))
    .filter((plan) => plan.rowWidthPx <= usableWidthPx);
  if (plans.length === 0) {
    return null;
  }

  const originalPlan = plans.find((plan) => plan.patternKey === rowBoxes.map(() => "0").join(""));
  if (!originalPlan) {
    // If the original orientation cannot fit, prefer the all-valid-rotated pattern when it fits.
    const allRotatedPattern = rowBoxes
      .map((box) => (box.originalWidthPx !== box.originalHeightPx && box.originalHeightPx <= usableWidthPx ? "1" : "0"))
      .join("");
    const allRotatedPlan = plans.find((plan) => plan.patternKey === allRotatedPattern);
    if (allRotatedPlan) {
      return allRotatedPlan;
    }
  }

  return [...plans].sort(compareRowPlans)[0] ?? null;
}

function layoutRow(
  plan: RowOrientationPlan,
  rowY: number,
  usableWidthPx: number,
  sideMarginPx: number,
  gutterPx: number,
): { placements: NestedPlacement[]; rowHeightPx: number } {
  const rowStartX = sideMarginPx + Math.round((usableWidthPx - plan.rowWidthPx) / 2);
  const placements: NestedPlacement[] = [];
  let cursorX = rowStartX;

  for (const [index, box] of plan.boxes.entries()) {
    placements.push({ id: box.id, x: cursorX, y: rowY, rotated: plan.rotated[index] ?? false });
    cursorX += box.widthPx + gutterPx;
  }

  return { placements, rowHeightPx: plan.rowHeightPx };
}

function buildInternalBoxes(boxes: NestableBox[]): RowBox[] {
  return boxes.map((box, inputOrder) => ({
    ...box,
    originalWidthPx: box.widthPx,
    originalHeightPx: box.heightPx,
    inputOrder,
  }));
}

function buildSortedBoxes(boxes: RowBox[]): RowBox[] {
  return [...boxes].sort(compareStableHeight);
}

function getSkippedBoxes(
  boxes: RowBox[],
  usableWidthPx: number,
  allowRotation: boolean,
): { skipped: { id: string; reason: "too_wide_for_sheet" }[]; nestable: RowBox[] } {
  const skipped: { id: string; reason: "too_wide_for_sheet" }[] = [];
  const nestable: RowBox[] = [];

  for (const box of boxes) {
    const fitsOriginal = box.originalWidthPx <= usableWidthPx;
    const fitsRotated = box.originalHeightPx <= usableWidthPx;
    if (!fitsOriginal && (!allowRotation || !fitsRotated)) {
      skipped.push({ id: box.id, reason: "too_wide_for_sheet" });
    } else {
      nestable.push(box);
    }
  }

  return { skipped, nestable };
}

function resolveLegacyRowRotations(rowBoxes: RowBox[], usableWidthPx: number, gutterPx: number): RowBox[] {
  const resolved: RowBox[] = rowBoxes.map((box) => ({ ...box }));

  for (const [index, box] of resolved.entries()) {
    const isPortrait = box.originalHeightPx > box.originalWidthPx;
    const currentRowHeightPx = Math.max(...resolved.map((rowBox) => rowBox.heightPx));

    if (!isPortrait || box.heightPx < currentRowHeightPx) {
      continue;
    }

    const rotatedWidthPx = box.originalHeightPx;
    const rotatedHeightPx = box.originalWidthPx;

    const otherRowHeightPx = Math.max(
      0,
      ...resolved.filter((_, otherIndex) => otherIndex !== index).map((rowBox) => rowBox.heightPx),
    );
    if (Math.max(otherRowHeightPx, rotatedHeightPx) >= currentRowHeightPx) {
      continue;
    }

    if (resolved.length === 1) {
      if (rotatedWidthPx <= usableWidthPx) {
        resolved[index] = { ...box, widthPx: rotatedWidthPx, heightPx: rotatedHeightPx };
      }
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

function packLegacy(
  boxes: NestableBox[],
  sheetWidthPx: number,
  spacing: NestingSpacingPx,
  maxSheetHeightPx: number,
): InternalNestResult {
  const usableWidthPx = sheetWidthPx - 2 * spacing.sideMarginPx;
  const { skipped, nestable } = getSkippedBoxes(buildInternalBoxes(boxes), usableWidthPx, false);
  const sorted = buildSortedBoxes(nestable);
  const sheets: InternalNestedSheet[] = [];
  let placements: NestedPlacement[] = [];
  let cursorY = spacing.topBottomMarginPx;
  let rowBoxes: RowBox[] = [];
  let rowWidthUsedPx = 0;
  let rowCount = 0;
  let rotationCount = 0;

  const closeRow = (): number => {
    if (rowBoxes.length === 0) {
      return 0;
    }

    const resolved = resolveLegacyRowRotations(rowBoxes, usableWidthPx, spacing.gutterPx);
    const plan = buildRowPlan(
      rowBoxes,
      resolved.map(
        (box, index) =>
          box.widthPx !== rowBoxes[index]!.originalWidthPx ||
          box.heightPx !== rowBoxes[index]!.originalHeightPx,
      ),
      spacing.gutterPx,
    );
    const rowLayout = layoutRow(plan, cursorY, usableWidthPx, spacing.sideMarginPx, spacing.gutterPx);
    placements.push(...rowLayout.placements);
    cursorY += rowLayout.rowHeightPx + spacing.gutterPx;
    rowCount += 1;
    rotationCount += rowLayout.placements.filter((placement) => placement.rotated).length;
    rowBoxes = [];
    rowWidthUsedPx = 0;
    return rowLayout.rowHeightPx;
  };

  const finishSheet = (): void => {
    if (placements.length === 0) {
      return;
    }
    sheets.push({
      placements,
      sheetHeightPx: cursorY - spacing.gutterPx + spacing.topBottomMarginPx,
    });
    placements = [];
    cursorY = spacing.topBottomMarginPx;
  };

  for (const box of sorted) {
    const isRowEmpty = rowBoxes.length === 0;
    const widthNeededPx = isRowEmpty ? box.widthPx : rowWidthUsedPx + spacing.gutterPx + box.widthPx;

    if (!isRowEmpty && widthNeededPx > usableWidthPx) {
      const pendingRowHeightPx = Math.max(...resolveLegacyRowRotations(rowBoxes, usableWidthPx, spacing.gutterPx).map((rowBox) => rowBox.heightPx));
      const nextRowHeightPx = Math.min(box.heightPx, box.widthPx < box.heightPx && box.heightPx <= usableWidthPx ? box.widthPx : box.heightPx);
      const nextRowBottomY = cursorY + pendingRowHeightPx + spacing.gutterPx + nextRowHeightPx + spacing.topBottomMarginPx;
      closeRow();
      if (nextRowBottomY > maxSheetHeightPx) {
        finishSheet();
      }
    }

    rowBoxes.push(box);
    rowWidthUsedPx = rowBoxes.length === 1 ? box.widthPx : rowWidthUsedPx + spacing.gutterPx + box.widthPx;
  }

  closeRow();
  finishSheet();

  return { sheets, skipped, rowCount, rotationCount };
}

function packOrientationAware(
  boxes: NestableBox[],
  sheetWidthPx: number,
  spacing: NestingSpacingPx,
  maxSheetHeightPx: number,
): InternalNestResult {
  const usableWidthPx = sheetWidthPx - 2 * spacing.sideMarginPx;
  const { skipped, nestable } = getSkippedBoxes(buildInternalBoxes(boxes), usableWidthPx, true);
  const sorted = buildSortedBoxes(nestable);
  const sheets: InternalNestedSheet[] = [];
  let placements: NestedPlacement[] = [];
  let cursorY = spacing.topBottomMarginPx;
  let rowBoxes: RowBox[] = [];
  let rowCount = 0;
  let rotationCount = 0;

  const closeRow = (): number => {
    if (rowBoxes.length === 0) {
      return 0;
    }

    const plan = selectOrientationPlan(rowBoxes, usableWidthPx, spacing.gutterPx);
    if (!plan) {
      throw new Error("Orientation-aware shelf packing could not resolve a row that was admitted.");
    }

    const rowLayout = layoutRow(plan, cursorY, usableWidthPx, spacing.sideMarginPx, spacing.gutterPx);
    placements.push(...rowLayout.placements);
    cursorY += rowLayout.rowHeightPx + spacing.gutterPx;
    rowCount += 1;
    rotationCount += plan.rotationCount;
    rowBoxes = [];
    return rowLayout.rowHeightPx;
  };

  const finishSheet = (): void => {
    if (placements.length === 0) {
      return;
    }
    sheets.push({
      placements,
      sheetHeightPx: cursorY - spacing.gutterPx + spacing.topBottomMarginPx,
    });
    placements = [];
    cursorY = spacing.topBottomMarginPx;
  };

  for (const box of sorted) {
    const candidateRow = [...rowBoxes, box];
    const candidatePlan = selectOrientationPlan(candidateRow, usableWidthPx, spacing.gutterPx);
    const candidateBottomY = candidatePlan
      ? cursorY + candidatePlan.rowHeightPx + spacing.topBottomMarginPx
      : Number.POSITIVE_INFINITY;
    const isOversizedSingleRow = candidatePlan?.boxes.length === 1 && placements.length === 0 && rowBoxes.length === 0;
    const candidateFitsHeight = Boolean(candidatePlan) && (candidateBottomY <= maxSheetHeightPx || isOversizedSingleRow);

    if (candidatePlan && candidateFitsHeight) {
      rowBoxes.push(box);
      continue;
    }

    const pendingPlan = rowBoxes.length > 0 ? selectOrientationPlan(rowBoxes, usableWidthPx, spacing.gutterPx) : null;
    const nextRowPlan = selectOrientationPlan([box], usableWidthPx, spacing.gutterPx);
    if (!nextRowPlan || (rowBoxes.length > 0 && !pendingPlan)) {
      throw new Error("Orientation-aware shelf packing lost an admitted box.");
    }

    if (pendingPlan) {
      const nextRowBottomY = cursorY + pendingPlan.rowHeightPx + spacing.gutterPx + nextRowPlan.rowHeightPx + spacing.topBottomMarginPx;
      closeRow();
      if (nextRowBottomY > maxSheetHeightPx) {
        finishSheet();
      }
    } else if (placements.length > 0) {
      finishSheet();
    }
    rowBoxes.push(box);
  }

  closeRow();
  finishSheet();

  return { sheets, skipped, rowCount, rotationCount };
}

function getTotalSheetHeight(layout: InternalNestResult): number {
  return layout.sheets.reduce((sum, sheet) => sum + sheet.sheetHeightPx, 0);
}

function compareCompleteLayouts(baseline: InternalNestResult, candidate: InternalNestResult): InternalNestResult {
  if (candidate.skipped.length !== baseline.skipped.length) {
    return candidate.skipped.length < baseline.skipped.length ? candidate : baseline;
  }

  const baselineHeight = getTotalSheetHeight(baseline);
  const candidateHeight = getTotalSheetHeight(candidate);
  if (candidateHeight !== baselineHeight) {
    return candidateHeight < baselineHeight ? candidate : baseline;
  }

  // Exact efficiency ties intentionally preserve the compatibility layout, even when a candidate
  // happens to use fewer rows. This avoids unnecessary orientation churn on equal feed length.
  return baseline;
}

function chooseLayout(
  boxes: NestableBox[],
  sheetWidthPx: number,
  spacing: NestingSpacingPx,
  maxSheetHeightPx: number,
): InternalNestResult {
  const baseline = packLegacy(boxes, sheetWidthPx, spacing, maxSheetHeightPx);
  const candidate = packOrientationAware(boxes, sheetWidthPx, spacing, maxSheetHeightPx);
  return compareCompleteLayouts(baseline, candidate);
}

function toSingleSheetResult(layout: InternalNestResult): NestResult {
  if (layout.sheets.length === 0) {
    return { placements: [], sheetHeightPx: 0, skipped: layout.skipped };
  }

  if (layout.sheets.length === 1) {
    const sheet = layout.sheets[0]!;
    return { placements: sheet.placements, sheetHeightPx: sheet.sheetHeightPx, skipped: layout.skipped };
  }

  // The uncapped API historically emitted one sheet. Infinity keeps this branch defensive only.
  const placements = layout.sheets.flatMap((sheet) => sheet.placements);
  return { placements, sheetHeightPx: getTotalSheetHeight(layout), skipped: layout.skipped };
}

export function nestBoxesIntoShelves(
  boxes: NestableBox[],
  sheetWidthPx: number,
  spacing: NestingSpacingPx,
): NestResult {
  return toSingleSheetResult(chooseLayout(boxes, sheetWidthPx, spacing, Number.POSITIVE_INFINITY));
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
 * Nests boxes into deterministic shelf rows and starts a new sheet once the finalized row plan
 * would exceed `maxSheetHeightPx`.
 */
export function nestBoxesIntoShelvesWithHeightCap(
  boxes: NestableBox[],
  sheetWidthPx: number,
  spacing: NestingSpacingPx,
  maxSheetHeightPx: number,
): MultiSheetNestResult {
  const layout = chooseLayout(boxes, sheetWidthPx, spacing, maxSheetHeightPx);
  return { sheets: layout.sheets, skipped: layout.skipped };
}
