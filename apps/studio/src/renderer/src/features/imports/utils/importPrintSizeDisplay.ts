import type { PrintSizeAssessment } from "@fresh-prints/shared/types/printSize/printSize.types";
import type { ImportPngWarning } from "@fresh-prints/shared/types/import/importIpc.types";
import { PRINT_INCHES_DECIMAL_PLACES } from "@fresh-prints/shared/constants/printSize.constants";
import { getImportValidationMessageClassName } from "./importValidationWarningDisplay";
export function formatPrintInchesDisplay(value: number): string {
  return value.toFixed(PRINT_INCHES_DECIMAL_PLACES);
}

export function getPrintSizeAcceptanceLabel(
  acceptanceLevel: PrintSizeAssessment["acceptanceLevel"],
): string {
  switch (acceptanceLevel) {
    case "accept":
      return "Accepted — optimal resolution";
    case "warn":
      return "Accepted — good resolution";
    case "small_format":
      return "Accepted — bad resolution";
    case "terrible":
      return "Accepted — terrible resolution (minimum floor)";
    case "reject":
      return "Rejected";
    default:
      return acceptanceLevel;
  }
}

export function getImportWarningMessageClassName(code: ImportPngWarning["code"]): string {
  return getImportValidationMessageClassName(code);
}

export { getImportValidationMessageClassName } from "./importValidationWarningDisplay";