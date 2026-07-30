import { writeFile } from "node:fs/promises";
import path from "node:path";

import { BrowserWindow, dialog } from "electron";

import { isAllowedFirebaseStorageDownloadUrl } from "./firebaseStorageDownloadUrl";
import { sanitizeDownloadFileName } from "./downloadFileName";

export { isAllowedFirebaseStorageDownloadUrl } from "./firebaseStorageDownloadUrl";

function extensionFromContentType(contentType: string | null): string | null {
  if (!contentType) {
    return null;
  }
  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  switch (normalized) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return null;
  }
}

function ensureExtension(fileName: string, contentType: string | null): string {
  if (path.extname(fileName)) {
    return fileName;
  }
  const extension = extensionFromContentType(contentType);
  return extension ? `${fileName}${extension}` : fileName;
}

export async function downloadFirebaseStorageUrlToFile(options: {
  downloadUrl: string;
  fileName: string;
  ownerWindow: BrowserWindow | null;
}): Promise<{ canceled: boolean; savedFilePath?: string }> {
  if (!isAllowedFirebaseStorageDownloadUrl(options.downloadUrl)) {
    throw new Error("Only Firebase Storage download URLs can be saved.");
  }

  const response = await fetch(options.downloadUrl);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}).`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const suggestedName = ensureExtension(
    sanitizeDownloadFileName(options.fileName),
    response.headers.get("content-type"),
  );
  const extension = path.extname(suggestedName).replace(/^\./, "").toLowerCase();

  const saveDialogOptions = {
    title: "Save image",
    defaultPath: suggestedName,
    filters: extension
      ? [
          { name: "Image", extensions: [extension] },
          { name: "All Files", extensions: ["*"] },
        ]
      : [{ name: "All Files", extensions: ["*"] }],
  };

  const dialogResult = options.ownerWindow
    ? await dialog.showSaveDialog(options.ownerWindow, saveDialogOptions)
    : await dialog.showSaveDialog(saveDialogOptions);

  if (dialogResult.canceled || !dialogResult.filePath) {
    return { canceled: true };
  }

  await writeFile(dialogResult.filePath, bytes);
  return { canceled: false, savedFilePath: dialogResult.filePath };
}
