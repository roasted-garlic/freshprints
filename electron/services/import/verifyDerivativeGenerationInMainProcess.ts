import type { DerivativeGenerationVerificationResult } from "../../../shared/types/import/derivativeGeneration.types";
import { derivativeGenerationService } from "./derivativeGenerationService";
import { ensureSharpLoaded, loadSharpModule } from "./loadSharpModule";

async function createTestPngBuffer(options: {
  width: number;
  height: number;
  alpha: number;
}): Promise<Uint8Array> {
  const sharpApi = await loadSharpModule();
  const buffer = await sharpApi({
    create: {
      width: options.width,
      height: options.height,
      channels: 4,
      background: { r: 200, g: 40, b: 40, alpha: options.alpha },
    },
  })
    .png()
    .toBuffer();

  return Uint8Array.from(buffer);
}

/**
 * Dev-only self-test proving sharp and derivativeGenerationService work in the Electron main process.
 * Uses embedded fixtures only — no renderer-supplied bytes.
 */
export async function verifyDerivativeGenerationInMainProcess(): Promise<DerivativeGenerationVerificationResult> {
  const details: string[] = [];
  const sharpStatus = await ensureSharpLoaded();

  if (!sharpStatus.ok) {
    details.push(sharpStatus.error.message);

    return {
      sharpLoadOk: false,
      sharpVersion: null,
      validPngTestPassed: false,
      transparentPngTestPassed: false,
      noUpscaleTestPassed: false,
      invalidPngTestPassed: false,
      details,
    };
  }

  details.push(`sharp ${sharpStatus.version} loaded in main process.`);

  const validPngBytes = await createTestPngBuffer({ width: 800, height: 600, alpha: 1 });
  const validResult = await derivativeGenerationService.generateFromPngBytes({
    pngBytes: validPngBytes,
    fileName: "verify-valid.png",
    fileSizeBytes: validPngBytes.byteLength,
  });

  const validPngTestPassed = validResult.success;

  if (validPngTestPassed) {
    details.push(
      `Valid PNG test passed (thumbnail ${validResult.data.thumbnail.width}x${validResult.data.thumbnail.height}, preview ${validResult.data.preview.width}x${validResult.data.preview.height}).`,
    );
  } else {
    details.push(`Valid PNG test failed: ${validResult.error.message}`);
  }

  const transparentPngBytes = await createTestPngBuffer({ width: 400, height: 400, alpha: 0.4 });
  const transparentResult = await derivativeGenerationService.generateFromPngBytes({
    pngBytes: transparentPngBytes,
    fileName: "verify-transparent.png",
    fileSizeBytes: transparentPngBytes.byteLength,
  });

  const transparentPngTestPassed = transparentResult.success;

  if (transparentPngTestPassed) {
    details.push("Transparent PNG test passed.");
  } else {
    details.push(`Transparent PNG test failed: ${transparentResult.error.message}`);
  }

  const smallPngBytes = await createTestPngBuffer({ width: 64, height: 48, alpha: 1 });
  const noUpscaleResult = await derivativeGenerationService.generateFromPngBytes({
    pngBytes: smallPngBytes,
    fileName: "verify-small.png",
    fileSizeBytes: smallPngBytes.byteLength,
  });

  const noUpscaleTestPassed =
    noUpscaleResult.success &&
    noUpscaleResult.data.thumbnail.width === 64 &&
    noUpscaleResult.data.thumbnail.height === 48;

  if (noUpscaleTestPassed) {
    details.push("No-upscale test passed (64x48 thumbnail preserved).");
  } else if (noUpscaleResult.success) {
    details.push(
      `No-upscale test failed: thumbnail became ${noUpscaleResult.data.thumbnail.width}x${noUpscaleResult.data.thumbnail.height}.`,
    );
  } else {
    details.push(`No-upscale test failed: ${noUpscaleResult.error.message}`);
  }

  const invalidResult = await derivativeGenerationService.generateFromPngBytes({
    pngBytes: Uint8Array.from([0x00, 0x01, 0x02, 0x03]),
    fileName: "verify-invalid.png",
    fileSizeBytes: 4,
  });

  const invalidPngTestPassed = !invalidResult.success && invalidResult.error.code === "INVALID_PNG";

  if (invalidPngTestPassed) {
    details.push("Invalid PNG test passed (safe rejection).");
  } else {
    details.push("Invalid PNG test failed (expected INVALID_PNG rejection).");
  }

  return {
    sharpLoadOk: true,
    sharpVersion: sharpStatus.version,
    validPngTestPassed,
    transparentPngTestPassed,
    noUpscaleTestPassed,
    invalidPngTestPassed,
    details,
  };
}

export async function runDevDerivativeGenerationVerification(): Promise<void> {
  const result = await verifyDerivativeGenerationInMainProcess();
  const passed =
    result.sharpLoadOk &&
    result.validPngTestPassed &&
    result.transparentPngTestPassed &&
    result.noUpscaleTestPassed &&
    result.invalidPngTestPassed;

  const prefix = passed ? "[Phase 3C] Derivative verification passed" : "[Phase 3C] Derivative verification failed";

  console.info(prefix, result);
}
