import type { ImportPngWarning } from "@fresh-prints/shared/types/import/importIpc.types";

const IMPORT_VALIDATION_INFO_CODES = new Set<ImportPngWarning["code"]>([
  "DPI_METADATA_MISSING",
  "IMAGE_TRIMMED",
  "IMAGE_UPSCALED",
  "PRINT_SIZE_NORMALIZED",
]);

export function isImportValidationInfoMessage(code: ImportPngWarning["code"]): boolean {
  return IMPORT_VALIDATION_INFO_CODES.has(code);
}

export function importValidationMessagesIncludeWarning(
  warnings: readonly ImportPngWarning[],
): boolean {
  return warnings.some((warning) => !isImportValidationInfoMessage(warning.code));
}

export function getImportValidationWarningPrefix(code: ImportPngWarning["code"]): string {
  if (isImportValidationInfoMessage(code)) {
    return "";
  }

  if (code === "PRINT_SIZE_SMALL_FORMAT") {
    return "Small-format: ";
  }

  return "";
}

export function formatImportValidationWarningMessage(warning: ImportPngWarning): string {
  return `${getImportValidationWarningPrefix(warning.code)}${warning.message}`;
}

export function getImportValidationMessageClassName(code: ImportPngWarning["code"]): string {
  if (isImportValidationInfoMessage(code)) {
    return "auth-message auth-message-info";
  }

  switch (code) {
    case "PRINT_SIZE_SMALL_FORMAT":
    case "PRINT_SIZE_TERRIBLE":
      return "auth-message auth-message-warning batch-import-file-validation-warning-strong";
    default:
      return "auth-message auth-message-warning";
  }
}
