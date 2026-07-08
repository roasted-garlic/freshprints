import { lstat, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { app } from "electron";

import { STALE_IMPORT_TEMP_DIR_MAX_AGE_MS } from "@fresh-prints/shared/constants/import/importTemp.constants";
import {
  ImportTempPathSafetyError,
  isImportJobTempDirName,
  isPathInsideImportTempRoot,
  resolveImportTempRootPath,
  resolveJobTempDirPath,
  validateImportJobId,
} from "./importTempPathSafety";

export {
  ImportTempPathSafetyError,
  InvalidImportJobIdError,
} from "./importTempPathSafety";

export function getImportTempRootPath(): string {
  return resolveImportTempRootPath(app.getPath("temp"));
}

export function getJobTempDirPath(jobId: string): string {
  return resolveJobTempDirPath(app.getPath("temp"), jobId);
}

async function ensureDirectoryExists(directoryPath: string): Promise<void> {
  await mkdir(directoryPath, { recursive: true });
}

async function assertSafeJobTempDirectory(directoryPath: string): Promise<void> {
  const tempRoot = getImportTempRootPath();
  const resolvedPath = path.resolve(directoryPath);

  if (!isPathInsideImportTempRoot(resolvedPath, tempRoot)) {
    throw new ImportTempPathSafetyError("Refusing to operate on a path outside the import temp root.");
  }

  const directoryStats = await lstat(resolvedPath);

  if (directoryStats.isSymbolicLink()) {
    throw new ImportTempPathSafetyError("Refusing to operate on a symlinked job temp directory.");
  }

  if (!directoryStats.isDirectory()) {
    throw new ImportTempPathSafetyError("The job temp path is not a directory.");
  }
}

export async function ensureImportTempRoot(): Promise<string> {
  const tempRoot = getImportTempRootPath();
  await ensureDirectoryExists(tempRoot);
  return tempRoot;
}

export async function createJobTempDir(jobId: string): Promise<string> {
  validateImportJobId(jobId);

  const tempRoot = await ensureImportTempRoot();
  const jobDir = resolveJobTempDirPath(app.getPath("temp"), jobId);

  if (!isPathInsideImportTempRoot(jobDir, tempRoot)) {
    throw new ImportTempPathSafetyError("Refusing to create a job temp directory outside the import temp root.");
  }

  await ensureDirectoryExists(jobDir);
  return jobDir;
}

export async function jobTempDirExists(jobId: string): Promise<boolean> {
  validateImportJobId(jobId);

  const jobDir = getJobTempDirPath(jobId);

  try {
    const jobDirStats = await stat(jobDir);
    return jobDirStats.isDirectory();
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return false;
    }

    throw error;
  }
}

export async function deleteJobTempDir(jobId: string): Promise<boolean> {
  validateImportJobId(jobId);

  const jobDir = getJobTempDirPath(jobId);

  try {
    await assertSafeJobTempDirectory(jobDir);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return false;
    }

    throw error;
  }

  await rm(jobDir, { recursive: true, force: true, maxRetries: 3 });
  return true;
}

/**
 * Deletes stale per-job temp directories inside the Fresh Prints import temp root.
 * Intended for future startup housekeeping — not invoked automatically in Step 5.
 */
export async function cleanStaleImportTempDirs(
  maxAgeMs: number = STALE_IMPORT_TEMP_DIR_MAX_AGE_MS,
): Promise<number> {
  if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) {
    throw new Error("Stale temp directory cleanup requires a positive max age.");
  }

  const tempRoot = getImportTempRootPath();

  let entries: string[];

  try {
    entries = await readdir(tempRoot);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return 0;
    }

    throw error;
  }

  const now = Date.now();
  let deletedCount = 0;

  for (const entryName of entries) {
    if (!isImportJobTempDirName(entryName)) {
      continue;
    }

    const entryPath = path.resolve(tempRoot, entryName);

    if (!isPathInsideImportTempRoot(entryPath, tempRoot)) {
      continue;
    }

    let entryStats;

    try {
      entryStats = await lstat(entryPath);
    } catch {
      continue;
    }

    if (entryStats.isSymbolicLink() || !entryStats.isDirectory()) {
      continue;
    }

    const ageMs = now - entryStats.mtimeMs;

    if (ageMs < maxAgeMs) {
      continue;
    }

    try {
      await assertSafeJobTempDirectory(entryPath);
      await rm(entryPath, { recursive: true, force: true, maxRetries: 3 });
      deletedCount += 1;
    } catch {
      continue;
    }
  }

  return deletedCount;
}
