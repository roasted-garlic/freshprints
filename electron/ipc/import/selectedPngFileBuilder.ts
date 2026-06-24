import { stat } from "node:fs/promises";
import path from "node:path";

import type { SelectedPngFile } from "../../../shared/types/import/importIpc.types";
import { getFileExtension, getFileName, hasAllowedExtension } from "./importPathUtils";
import { getSelectedPngExtension } from "./pngValidator";

export async function buildSelectedPngFile(filePath: string): Promise<SelectedPngFile> {
  const normalizedPath = path.normalize(filePath);
  const fileStats = await stat(normalizedPath);

  if (!fileStats.isFile()) {
    throw new Error("The selected path is not a file.");
  }

  if (!hasAllowedExtension(normalizedPath)) {
    throw new Error("Only PNG files can be selected.");
  }

  return {
    filePath: normalizedPath,
    fileName: getFileName(normalizedPath),
    fileSizeBytes: fileStats.size,
    extension: getSelectedPngExtension(normalizedPath) || getFileExtension(normalizedPath),
  };
}
