import path from "node:path";

import { stat } from "node:fs/promises";

import { getFileExtension, getFileName } from "./importPathUtils";

export async function buildSelectedZipFile(filePath: string): Promise<{
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
}> {
  const normalizedPath = path.normalize(filePath);
  const fileStats = await stat(normalizedPath);

  if (!fileStats.isFile()) {
    throw new Error("The selected path is not a file.");
  }

  if (getFileExtension(normalizedPath) !== ".zip") {
    throw new Error("Only ZIP files can be selected.");
  }

  return {
    filePath: normalizedPath,
    fileName: getFileName(normalizedPath),
    fileSizeBytes: fileStats.size,
  };
}
