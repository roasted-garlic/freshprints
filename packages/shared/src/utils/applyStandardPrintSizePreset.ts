import type { PrintRequestItemSizeAssessment } from "./printRequestItemSizing";
import {
  assessPrintRequestItemSize,
  calculateLockedHeightFromWidth,
} from "./printRequestItemSizing";

export function applyStandardPrintSizePreset(input: {
  presetWidthInches: number;
  pixelWidth: number;
  pixelHeight: number;
  approvedMaxPrintWidthInches?: number;
  approvedMaxPrintHeightInches?: number;
  wasUpscaled?: boolean;
}): {
  printWidthInches: number;
  printHeightInches: number;
  assessment: PrintRequestItemSizeAssessment;
} {
  const printWidthInches = input.presetWidthInches;
  const printHeightInches = calculateLockedHeightFromWidth(
    input.pixelWidth,
    input.pixelHeight,
    printWidthInches,
  );
  const assessment = assessPrintRequestItemSize({
    pixelWidth: input.pixelWidth,
    pixelHeight: input.pixelHeight,
    printWidthInches,
    printHeightInches,
    approvedMaxPrintWidthInches: input.approvedMaxPrintWidthInches,
    approvedMaxPrintHeightInches: input.approvedMaxPrintHeightInches,
    wasUpscaled: input.wasUpscaled,
  });
  return { printWidthInches, printHeightInches, assessment };
}
