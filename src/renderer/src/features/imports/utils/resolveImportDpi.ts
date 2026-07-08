import type { ValidateSelectedPngFileResult } from "@fresh-prints/shared/types/import/importIpc.types";

export function resolveImportDpi(
  validationResult: ValidateSelectedPngFileResult,
): number | undefined {
  const { dpiX, dpiY } = validationResult;

  if (dpiX !== undefined && dpiY !== undefined) {
    return Math.min(dpiX, dpiY);
  }

  return dpiX ?? dpiY;
}
