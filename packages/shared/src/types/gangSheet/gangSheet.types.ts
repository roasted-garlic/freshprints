import type { Timestamp } from "firebase/firestore";

import type { GangSheetStatus } from "./gangSheet.enums";

/**
 * A saved, staff-authored production layout for one show. Slice 1 creates exactly one sheet per
 * show, but `sheetNumber` is modeled from the start so multi-sheet support in a later slice does
 * not require a data-model rewrite.
 */
export interface GangSheet {
  id: string;
  upcomingShowId: string;
  title?: string;

  status: GangSheetStatus;

  sheetWidthInches: number;
  sheetHeightInches: number;
  dpi: number;
  backgroundColor?: string;

  itemCount: number;
  totalQuantity: number;

  /** Timer/export fields are modeled for forward compatibility; not used by Slice 1 UI/behavior. */
  accumulatedPrintMs: number;
  activePrintStartedAt?: Timestamp;
  printStartedAt?: Timestamp;
  printPausedAt?: Timestamp;
  printFinishedAt?: Timestamp;
  printFinishedBy?: string;
  lastResetAt?: Timestamp;
  lastResetBy?: string;

  lastExportedAt?: Timestamp;
  lastExportedBy?: string;
  lastExportFileName?: string;

  sheetNumber: number;

  createdBy: string;
  updatedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * One placed physical copy on a gang sheet. A `showAllocation` with `allocatedQuantity = N`
 * produces up to N placed `GangSheetItem` records (`copyIndex` 0..N-1), keeping the saved layout
 * faithful to what will actually print.
 */
export interface GangSheetItem {
  id: string;
  gangSheetId: string;
  upcomingShowId: string;
  showAllocationId: string;
  printRequestId: string;
  printRequestItemId: string;
  designId: string;

  copyIndex: number;
  sourceQuantitySnapshot: number;

  designTitleSnapshot?: string;
  requestNameSnapshot: string;
  /** Canonical `/originals/{designId}.png` path, preserved for future high-resolution export. */
  originalPathSnapshot: string;

  xInches: number;
  yInches: number;
  widthInches: number;
  heightInches: number;
  rotationDegrees: number;
  /** Not editable in Slice 1 UI; modeled now so a future flip toolbar needs no data-model change. */
  flipHorizontal: boolean;
  flipVertical: boolean;
  zIndex: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
