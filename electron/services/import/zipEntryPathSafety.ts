import path from "node:path";

import { ZipExtractionError } from "./zipExtractionErrors";

function isPathInsideExtractRoot(targetPath: string, extractRootPath: string): boolean {
  const normalizedRoot = path.resolve(extractRootPath);
  const normalizedTarget = path.resolve(targetPath);

  if (process.platform === "win32") {
    const rootLower = normalizedRoot.toLowerCase();
    const targetLower = normalizedTarget.toLowerCase();

    if (targetLower === rootLower) {
      return true;
    }

    return targetLower.startsWith(`${rootLower}${path.sep}`);
  }

  if (normalizedTarget === normalizedRoot) {
    return true;
  }

  return normalizedTarget.startsWith(`${normalizedRoot}${path.sep}`);
}

function isAbsoluteZipEntryName(entryName: string): boolean {
  if (path.isAbsolute(entryName)) {
    return true;
  }

  if (entryName.startsWith("/") || entryName.startsWith("\\")) {
    return true;
  }

  return /^[a-zA-Z]:[\\/]/.test(entryName);
}

export function isZipDirectoryEntry(entryName: string): boolean {
  return entryName.endsWith("/") || entryName.endsWith("\\");
}

export function resolveSafeZipEntryPath(entryName: string, extractRoot: string): string {
  if (!entryName.trim() || entryName.includes("\0")) {
    throw new ZipExtractionError("ZIP_PATH_TRAVERSAL", "The ZIP archive contains an invalid entry path.");
  }

  if (isAbsoluteZipEntryName(entryName)) {
    throw new ZipExtractionError(
      "ZIP_PATH_TRAVERSAL",
      "The ZIP archive contains an absolute path entry, which is not allowed.",
    );
  }

  if (isZipDirectoryEntry(entryName)) {
    throw new ZipExtractionError(
      "ZIP_PATH_TRAVERSAL",
      "Directory entries must be skipped before resolving a ZIP file path.",
    );
  }

  const posixPath = entryName.replace(/\\/g, "/");
  const segments = posixPath.split("/");

  if (segments.some((segment) => segment === "..")) {
    throw new ZipExtractionError(
      "ZIP_PATH_TRAVERSAL",
      "The ZIP archive contains a path traversal entry, which is not allowed.",
    );
  }

  const targetPath = path.resolve(extractRoot, ...segments.filter((segment) => segment.length > 0));

  if (!isPathInsideExtractRoot(targetPath, extractRoot)) {
    throw new ZipExtractionError(
      "ZIP_PATH_TRAVERSAL",
      "The ZIP archive contains an entry that would extract outside the job temp directory.",
    );
  }

  return targetPath;
}

export function toZipRelativePath(extractRoot: string, absolutePath: string): string {
  return path.relative(extractRoot, absolutePath).split(path.sep).join("/");
}
