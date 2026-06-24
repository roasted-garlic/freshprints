import { readFile } from "node:fs/promises";

import type { ReadSelectedPngFileBytesResult } from "../../../shared/types/import/importIpc.types";
import { getFileName } from "./importPathUtils";

export async function readBatchValidatedPngFileBytes(
  filePath: string,
): Promise<ReadSelectedPngFileBytesResult> {
  const fileBuffer = await readFile(filePath);

  return {
    bytes: Uint8Array.from(fileBuffer),
    fileName: getFileName(filePath),
    filePath,
    fileSizeBytes: fileBuffer.length,
  };
}
