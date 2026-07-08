import type { PrintSizeAssessment } from "@fresh-prints/shared/types/printSize/printSize.types";
import type { ImportPngWarning } from "@fresh-prints/shared/types/import/importIpc.types";
import { PRINT_INCHES_DECIMAL_PLACES } from "@fresh-prints/shared/constants/printSize.constants";

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
  switch (code) {
    case "PRINT_SIZE_NORMALIZED":
    case "IMAGE_TRIMMED":
    case "IMAGE_UPSCALED":
      return "auth-message auth-message-success";
    case "PRINT_SIZE_SMALL_FORMAT":
      return "auth-message auth-message-warning batch-import-file-validation-warning-strong";
    case "PRINT_SIZE_TERRIBLE":
      return "auth-message auth-message-warning batch-import-file-validation-warning-strong";
    case "PRINT_SIZE_BELOW_PREFERRED":
    case "DPI_METADATA_MISSING":
    case "DPI_BELOW_TARGET":
      return "auth-message auth-message-warning";
    default:
      return "auth-message auth-message-warning";
  }
}
