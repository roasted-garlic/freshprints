import type { ImportPngWarning } from "@fresh-prints/shared/types/import/importIpc.types";

export function getImportValidationWarningPrefix(code: ImportPngWarning["code"]): string {
  if (code === "PRINT_SIZE_NORMALIZED" || code === "IMAGE_UPSCALED") {
    return "";
  }

  if (code === "PRINT_SIZE_SMALL_FORMAT") {
    return "Small-format: ";
  }

  return "Warning: ";
}

export function formatImportValidationWarningMessage(warning: ImportPngWarning): string {
  return `${getImportValidationWarningPrefix(warning.code)}${warning.message}`;
}
