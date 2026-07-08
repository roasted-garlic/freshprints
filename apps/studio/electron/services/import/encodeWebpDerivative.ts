import {
  DERIVATIVE_ALLOW_UPSCALE,
  DERIVATIVE_PRESERVE_ALPHA,
  MAX_DERIVATIVE_FILE_SIZE_BYTES,
} from "@fresh-prints/shared/constants/import/derivativeGeneration.constants";
import type { DerivativeGenerationFailure } from "@fresh-prints/shared/types/import/derivativeGeneration.types";
import { isWebpMagicBytes } from "./derivativePngValidation";
import type { SharpConstructor } from "./loadSharpModule";

export interface EncodedWebpDerivative {
  bytes: Uint8Array;
  width: number;
  height: number;
  byteLength: number;
}

function mapSharpProcessingFailure(error: unknown, stage: "decode" | "encode"): DerivativeGenerationFailure {
  const detail = error instanceof Error ? error.message : "Unknown image processing error.";

  return {
    code: stage === "decode" ? "DECODE_FAILED" : "ENCODE_FAILED",
    message:
      stage === "decode"
        ? `The PNG image could not be decoded: ${detail}`
        : `The derivative image could not be encoded as WebP: ${detail}`,
  };
}

function assertDerivativeWithinSizeLimit(
  bytes: Uint8Array,
  label: "Thumbnail" | "Preview",
): DerivativeGenerationFailure | null {
  if (bytes.byteLength > MAX_DERIVATIVE_FILE_SIZE_BYTES) {
    return {
      code: "DERIVATIVE_TOO_LARGE",
      message: `${label} WebP output exceeds the maximum allowed size of ${MAX_DERIVATIVE_FILE_SIZE_BYTES} bytes.`,
    };
  }

  if (!isWebpMagicBytes(bytes)) {
    return {
      code: "ENCODE_FAILED",
      message: `${label} output is not a valid WebP image.`,
    };
  }

  return null;
}

export async function encodeWebpDerivative(
  sharpApi: SharpConstructor,
  inputBuffer: Buffer,
  options: {
    label: "Thumbnail" | "Preview";
    maxWidth: number;
    maxHeight: number;
    quality: number;
  },
): Promise<{ success: true; data: EncodedWebpDerivative } | { success: false; error: DerivativeGenerationFailure }> {
  try {
    const pipeline = sharpApi(inputBuffer, { failOn: "error" }).resize(
      options.maxWidth,
      options.maxHeight,
      {
        fit: "inside",
        withoutEnlargement: !DERIVATIVE_ALLOW_UPSCALE,
      },
    );

    const webpOptions: import("sharp").WebpOptions = {
      quality: options.quality,
      effort: 4,
    };

    if (DERIVATIVE_PRESERVE_ALPHA) {
      webpOptions.alphaQuality = options.quality;
    }

    const output = await pipeline.webp(webpOptions).toBuffer({ resolveWithObject: true });
    const bytes = Uint8Array.from(output.data);
    const sizeError = assertDerivativeWithinSizeLimit(bytes, options.label);

    if (sizeError) {
      return { success: false, error: sizeError };
    }

    return {
      success: true,
      data: {
        bytes,
        width: output.info.width,
        height: output.info.height,
        byteLength: bytes.byteLength,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";

    if (message.includes("input buffer") || message.includes("unsupported image") || message.includes("png")) {
      return { success: false, error: mapSharpProcessingFailure(error, "decode") };
    }

    return { success: false, error: mapSharpProcessingFailure(error, "encode") };
  }
}
