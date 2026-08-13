import {
  CATALOG_ARTWORK_REQUIRES_TRANSPARENT_BACKGROUND_MESSAGE,
  measureMeaningfulTransparency,
  type MeaningfulTransparencyMeasurement,
} from "@fresh-prints/shared/utils/meaningfulTransparencyMeasurement";

import { loadSharpModule } from "./loadSharpModule";

export type ImportTransparencyGateResult =
  | { ok: true; measurement: MeaningfulTransparencyMeasurement }
  | {
      ok: false;
      reasonCode: "BACKGROUND_NOT_TRANSPARENT" | "TRANSPARENCY_CHECK_FAILED";
      message: string;
      measurement: MeaningfulTransparencyMeasurement;
    };

/**
 * Fail-closed Studio catalog import gate: source PNG must satisfy the shared
 * meaningful-transparency policy before trim/upscale/upload.
 */
export async function evaluateImportPngMeaningfulTransparency(
  sourceBytes: Buffer,
): Promise<ImportTransparencyGateResult> {
  const sharp = await loadSharpModule();
  const measurement = await measureMeaningfulTransparency(sharp, sourceBytes);

  if (measurement.passed) {
    return { ok: true, measurement };
  }

  if (measurement.failureCode === "transparency_check_failed") {
    return {
      ok: false,
      reasonCode: "TRANSPARENCY_CHECK_FAILED",
      message: "Could not validate image transparency.",
      measurement,
    };
  }

  return {
    ok: false,
    reasonCode: "BACKGROUND_NOT_TRANSPARENT",
    message: CATALOG_ARTWORK_REQUIRES_TRANSPARENT_BACKGROUND_MESSAGE,
    measurement,
  };
}
