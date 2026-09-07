import {
  AI_ANALYSIS_CANVAS_SIZE_PX,
  AI_ANALYSIS_PADDING_PX,
  AI_ANALYSIS_WEBP_QUALITY,
  AI_ENRICHMENT_PLAYGROUND_SAFE_ENCODED_IMAGE_BYTES,
  type AiEnrichmentPlaygroundImageContentType,
} from "@fresh-prints/shared/constants/aiEnrichment.constants";
import {
  encodedImageFitsPlaygroundCallableLimit,
  estimateBase64EncodedByteLength,
} from "@fresh-prints/shared/utils/aiEnrichmentPlaygroundImagePayload";

/** Default AI analysis flatten background — matches Functions prepareAiAnalysisImage. */
const AI_ANALYSIS_BACKGROUND_HEX = "#808080";

export interface PlaygroundCallableImagePayload {
  imageBase64: string;
  imageContentType: AiEnrichmentPlaygroundImageContentType;
  /** True when a temporary AI-analysis derivative was used instead of the source file bytes. */
  usedAnalysisDerivative: boolean;
  sourceByteLength: number;
  requestByteLength: number;
  encodedByteLength: number;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return window.btoa(binary);
}

async function encodeFileToBase64(file: Blob): Promise<string> {
  return bytesToBase64(new Uint8Array(await file.arrayBuffer()));
}

function loadImageElement(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The selected image could not be decoded for AI analysis."));
    };
    image.src = url;
  });
}

/**
 * Build a temporary AI-analysis canvas derivative matching prepareAiAnalysisImage:
 * contain artwork into (1024-128) box, pad to 1024, flatten on #808080, encode WebP/JPEG.
 * Does not mutate the source File.
 */
export async function createPlaygroundAiAnalysisDerivative(
  source: Blob,
): Promise<{
  bytes: Uint8Array;
  contentType: AiEnrichmentPlaygroundImageContentType;
  width: number;
  height: number;
}> {
  const image = await loadImageElement(source);
  const artworkSize = AI_ANALYSIS_CANVAS_SIZE_PX - AI_ANALYSIS_PADDING_PX * 2;
  const scale = Math.min(
    artworkSize / Math.max(image.naturalWidth, 1),
    artworkSize / Math.max(image.naturalHeight, 1),
    1,
  );
  const drawWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const drawHeight = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = AI_ANALYSIS_CANVAS_SIZE_PX;
  canvas.height = AI_ANALYSIS_CANVAS_SIZE_PX;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error(
      "Unable to prepare an AI analysis image in this Studio environment.",
    );
  }
  context.fillStyle = AI_ANALYSIS_BACKGROUND_HEX;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const offsetX = Math.floor((AI_ANALYSIS_CANVAS_SIZE_PX - drawWidth) / 2);
  const offsetY = Math.floor((AI_ANALYSIS_CANVAS_SIZE_PX - drawHeight) / 2);
  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  const blob =
    (await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        resolve,
        "image/webp",
        AI_ANALYSIS_WEBP_QUALITY,
      );
    })) ??
    (await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", AI_ANALYSIS_WEBP_QUALITY);
    }));

  if (!blob) {
    throw new Error(
      "Unable to encode an AI analysis derivative for the Playground request.",
    );
  }

  const contentType =
    blob.type === "image/webp" || blob.type === "image/jpeg"
      ? (blob.type as AiEnrichmentPlaygroundImageContentType)
      : "image/jpeg";

  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    contentType,
    width: AI_ANALYSIS_CANVAS_SIZE_PX,
    height: AI_ANALYSIS_CANVAS_SIZE_PX,
  };
}

/**
 * Prepare Playground callable image bytes. Uses the source when it already fits
 * the encoded Gen2 ceiling; otherwise builds a temporary AI-analysis derivative.
 * Never mutates the caller's File.
 */
export async function preparePlaygroundCallableImage(
  source: File,
  safeEncodedLimitBytes = AI_ENRICHMENT_PLAYGROUND_SAFE_ENCODED_IMAGE_BYTES,
): Promise<PlaygroundCallableImagePayload> {
  const sourceByteLength = source.size;
  if (
    encodedImageFitsPlaygroundCallableLimit(
      sourceByteLength,
      safeEncodedLimitBytes,
    )
  ) {
    const imageBase64 = await encodeFileToBase64(source);
    return {
      imageBase64,
      imageContentType: source.type as AiEnrichmentPlaygroundImageContentType,
      usedAnalysisDerivative: false,
      sourceByteLength,
      requestByteLength: sourceByteLength,
      encodedByteLength: estimateBase64EncodedByteLength(sourceByteLength),
    };
  }

  const derivative = await createPlaygroundAiAnalysisDerivative(source);
  if (
    !encodedImageFitsPlaygroundCallableLimit(
      derivative.bytes.byteLength,
      safeEncodedLimitBytes,
    )
  ) {
    throw new Error(
      "This image is still too large for the AI Playground after preparing a safe analysis copy. Use a smaller source file.",
    );
  }

  return {
    imageBase64: bytesToBase64(derivative.bytes),
    imageContentType: derivative.contentType,
    usedAnalysisDerivative: true,
    sourceByteLength,
    requestByteLength: derivative.bytes.byteLength,
    encodedByteLength: estimateBase64EncodedByteLength(
      derivative.bytes.byteLength,
    ),
  };
}
