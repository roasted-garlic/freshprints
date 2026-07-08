import {
  METERS_PER_INCH,
  PNG_MAGIC_BYTES,
} from "@fresh-prints/shared/constants/importValidation.constants";
import type { PngDpiSource } from "@fresh-prints/shared/types/import/importIpc.types";

const PNG_SIGNATURE = Buffer.from(PNG_MAGIC_BYTES);

export interface ParsedPngMetadata {
  dpiSource?: PngDpiSource;
  dpiX?: number;
  dpiY?: number;
  hasDpiMetadata: boolean;
  height: number;
  width: number;
}

export function hasValidPngMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < PNG_SIGNATURE.length) {
    return false;
  }

  return buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
}

export function parsePngMetadata(buffer: Buffer): ParsedPngMetadata {
  if (!hasValidPngMagicBytes(buffer)) {
    throw new Error("The file does not contain a valid PNG signature.");
  }

  let width = 0;
  let height = 0;
  let dpiX: number | undefined;
  let dpiY: number | undefined;
  let hasDpiMetadata = false;
  let dpiSource: PngDpiSource | undefined;
  let foundIHDR = false;

  let offset = PNG_SIGNATURE.length;

  while (offset + 12 <= buffer.length) {
    const chunkLength = buffer.readUInt32BE(offset);
    const chunkType = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + chunkLength;

    if (dataEnd + 4 > buffer.length) {
      throw new Error("The PNG file header is incomplete or corrupt.");
    }

    if (chunkType === "IHDR" && chunkLength >= 13) {
      width = buffer.readUInt32BE(dataStart);
      height = buffer.readUInt32BE(dataStart + 4);
      foundIHDR = true;
    }

    if (chunkType === "pHYs" && chunkLength >= 9) {
      const pixelsPerUnitX = buffer.readUInt32BE(dataStart);
      const pixelsPerUnitY = buffer.readUInt32BE(dataStart + 4);
      const unitSpecifier = buffer.readUInt8(dataStart + 8);

      if (unitSpecifier === 1 && pixelsPerUnitX > 0 && pixelsPerUnitY > 0) {
        dpiX = pixelsPerUnitX * METERS_PER_INCH;
        dpiY = pixelsPerUnitY * METERS_PER_INCH;
        hasDpiMetadata = true;
        dpiSource = "pHYs";
      }
    }

    if (chunkType === "IEND") {
      break;
    }

    offset = dataEnd + 4;
  }

  if (!foundIHDR || width <= 0 || height <= 0) {
    throw new Error("The PNG file is missing required image dimensions.");
  }

  return {
    width,
    height,
    dpiX,
    dpiY,
    hasDpiMetadata,
    dpiSource,
  };
}
