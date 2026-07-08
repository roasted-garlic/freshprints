import { readFile } from "node:fs/promises";

import type { ReadSelectedPngFileBytesResult } from "@fresh-prints/shared/types/import/importIpc.types";
import { trimImportImageIfNeeded } from "../../services/import/trimImportImage";
import { upscaleImportImageIfNeeded } from "../../services/import/upscaleImportImage";
import { getFileName } from "./importPathUtils";
import { consumeCorrectedImportBytes } from "./correctedImportBytesCache";

export async function readBatchValidatedPngFileBytes(
  filePath: string,
): Promise<ReadSelectedPngFileBytesResult> {
  const cached = consumeCorrectedImportBytes(filePath);

  if (cached) {
    return {
      bytes: Uint8Array.from(cached.bytes),
      fileName: getFileName(filePath),
      filePath,
      fileSizeBytes: cached.bytes.length,
    };
  }

  const fileBuffer = await readFile(filePath);
  const trimResult = await trimImportImageIfNeeded(fileBuffer);
  const upscaleResult = await upscaleImportImageIfNeeded(
    trimResult.bytes,
    trimResult.width,
    trimResult.height,
  );

  return {
    bytes: Uint8Array.from(upscaleResult.bytes),
    fileName: getFileName(filePath),
    filePath,
    fileSizeBytes: upscaleResult.bytes.length,
  };
}
