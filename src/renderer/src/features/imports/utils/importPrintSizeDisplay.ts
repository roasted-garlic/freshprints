import type { PrintSizeAssessment } from "../../../../../../shared/types/printSize/printSize.types";
import type { ImportPngWarning } from "../../../../../../shared/types/import/importIpc.types";
import { PRINT_INCHES_DECIMAL_PLACES } from "../../../../../../shared/constants/printSize.constants";

export function formatPrintInchesDisplay(value: number): string {
  return value.toFixed(PRINT_INCHES_DECIMAL_PLACES);
}

export function getPrintSizeAcceptanceLabel(
  acceptanceLevel: PrintSizeAssessment["acceptanceLevel"],
): string {
  switch (acceptanceLevel) {
    case "accept":
      return "Accepted — preferred apparel size";
    case "warn":
      return "Accepted — standard apparel size";
    case "small_format":
      return "Accepted — small-format only";
    case "reject":
      return "Rejected";
    default:
      return acceptanceLevel;
  }
}

export function getImportWarningMessageClassName(code: ImportPngWarning["code"]): string {
  switch (code) {
    case "PRINT_SIZE_NORMALIZED":
      return "auth-message auth-message-success";
    case "PRINT_SIZE_SMALL_FORMAT":
      return "auth-message auth-message-warning batch-import-file-validation-warning-strong";
    case "PRINT_SIZE_BELOW_PREFERRED":
    case "DPI_METADATA_MISSING":
    case "DPI_BELOW_TARGET":
      return "auth-message auth-message-warning";
    default:
      return "auth-message auth-message-warning";
  }
}
