import { lstat, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { ALLOWED_EXTENSIONS } from "../../../shared/constants/importValidation.constants";
import {
  MAX_BATCH_FILES,
  MAX_FOLDER_DEPTH,
  MAX_FOLDER_SCAN_ENTRIES,
  MAX_FOLDER_ZIPS,
  MAX_ZIP_SIZE_BYTES,
} from "../../../shared/constants/import/batchImportLimits.constants";

export interface FolderScanCandidate {
  absolutePath: string;
  fileName: string;
  relativePath: string;
}

export interface FolderZipCandidate {
  absolutePath: string;
  fileName: string;
  relativePath: string;
}

export type FolderScanTruncationReason =
  | "MAX_BATCH_FILES"
  | "MAX_FOLDER_DEPTH"
  | "MAX_FOLDER_SCAN_ENTRIES"
  | "MAX_FOLDER_ZIPS";

export interface FolderScanResult {
  candidates: FolderScanCandidate[];
  zipCandidates: FolderZipCandidate[];
  directoriesSkippedDepth: number;
  entriesScanned: number;
  pngsDiscovered: number;
  zipsDiscovered: number;
  zipsSkipped: number;
  truncated: boolean;
  truncationReason?: FolderScanTruncationReason;
}

const IGNORE_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  "$RECYCLE.BIN",
  "System Volume Information",
]);

function hasPngExtension(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();

  return ALLOWED_EXTENSIONS.some((allowedExtension) => allowedExtension === extension);
}

function hasZipExtension(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === ".zip";
}

function compareEntryNames(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function isPathInsideRoot(targetPath: string, rootPath: string): boolean {
  const normalizedRoot = path.resolve(rootPath);
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

function toPosixRelativePath(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

async function scanDirectory(options: {
  currentPath: string;
  depth: number;
  onProgress?: (progress: { entriesScanned: number; pngsDiscovered: number }) => void;
  result: FolderScanResult;
  rootPath: string;
  shouldCancel: () => boolean;
}): Promise<void> {
  if (options.shouldCancel()) {
    return;
  }

  if (options.result.entriesScanned >= MAX_FOLDER_SCAN_ENTRIES) {
    options.result.truncated = true;
    options.result.truncationReason = "MAX_FOLDER_SCAN_ENTRIES";
    return;
  }

  let entries;

  try {
    entries = await readdir(options.currentPath, { withFileTypes: true });
  } catch {
    return;
  }

  entries.sort((left, right) => compareEntryNames(left.name, right.name));

  for (const entry of entries) {
    if (options.shouldCancel()) {
      return;
    }

    if (options.result.entriesScanned >= MAX_FOLDER_SCAN_ENTRIES) {
      options.result.truncated = true;
      options.result.truncationReason = "MAX_FOLDER_SCAN_ENTRIES";
      return;
    }

    options.result.entriesScanned += 1;
    options.onProgress?.({
      entriesScanned: options.result.entriesScanned,
      pngsDiscovered: options.result.pngsDiscovered,
    });

    const entryPath = path.join(options.currentPath, entry.name);

    if (!isPathInsideRoot(entryPath, options.rootPath)) {
      continue;
    }

    let entryStats;

    try {
      entryStats = await lstat(entryPath);
    } catch {
      continue;
    }

    if (entryStats.isSymbolicLink()) {
      continue;
    }

    if (entryStats.isDirectory()) {
      if (IGNORE_DIR_NAMES.has(entry.name)) {
        continue;
      }

      const childDepth = options.depth + 1;

      if (childDepth > MAX_FOLDER_DEPTH) {
        options.result.directoriesSkippedDepth += 1;
        options.result.truncated = true;
        options.result.truncationReason = "MAX_FOLDER_DEPTH";
        continue;
      }

      await scanDirectory({
        ...options,
        currentPath: entryPath,
        depth: childDepth,
      });
      continue;
    }

    if (!entryStats.isFile()) {
      continue;
    }

    if (!hasPngExtension(entryPath) && !hasZipExtension(entryPath)) {
      continue;
    }

    if (hasZipExtension(entryPath)) {
      options.result.zipsDiscovered += 1;

      if (options.result.zipCandidates.length >= MAX_FOLDER_ZIPS) {
        options.result.zipsSkipped += 1;
        options.result.truncated = true;
        options.result.truncationReason = "MAX_FOLDER_ZIPS";
        continue;
      }

      let zipSize = 0;

      try {
        zipSize = (await stat(entryPath)).size;
      } catch {
        options.result.zipsSkipped += 1;
        continue;
      }

      if (zipSize > MAX_ZIP_SIZE_BYTES) {
        options.result.zipsSkipped += 1;
        continue;
      }

      const relativePath = toPosixRelativePath(path.relative(options.rootPath, entryPath));

      options.result.zipCandidates.push({
        absolutePath: path.normalize(entryPath),
        fileName: entry.name,
        relativePath,
      });
      continue;
    }

    options.result.pngsDiscovered += 1;

    if (options.result.candidates.length >= MAX_BATCH_FILES) {
      options.result.truncated = true;
      options.result.truncationReason = "MAX_BATCH_FILES";
      continue;
    }

    const relativePath = toPosixRelativePath(path.relative(options.rootPath, entryPath));

    options.result.candidates.push({
      absolutePath: path.normalize(entryPath),
      fileName: entry.name,
      relativePath,
    });
  }
}

export async function scanFolderForPngFiles(
  rootPath: string,
  shouldCancel: () => boolean,
  onProgress?: (progress: { entriesScanned: number; pngsDiscovered: number }) => void,
): Promise<FolderScanResult> {
  const normalizedRoot = path.normalize(rootPath);
  const rootStats = await stat(normalizedRoot);

  if (!rootStats.isDirectory()) {
    throw new Error("The selected path is not a folder.");
  }

  const result: FolderScanResult = {
    candidates: [],
    zipCandidates: [],
    directoriesSkippedDepth: 0,
    entriesScanned: 0,
    pngsDiscovered: 0,
    zipsDiscovered: 0,
    zipsSkipped: 0,
    truncated: false,
  };

  await scanDirectory({
    currentPath: normalizedRoot,
    depth: 0,
    onProgress,
    result,
    rootPath: normalizedRoot,
    shouldCancel,
  });

  result.candidates.sort((left, right) => compareEntryNames(left.relativePath, right.relativePath));
  result.zipCandidates.sort((left, right) => compareEntryNames(left.relativePath, right.relativePath));

  return result;
}
