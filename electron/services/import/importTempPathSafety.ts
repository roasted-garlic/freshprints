import path from "node:path";

import {
  IMPORT_JOB_ID_PATTERN,
  IMPORT_TEMP_ROOT_DIR_NAME,
} from "@fresh-prints/shared/constants/import/importTemp.constants";

export class InvalidImportJobIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidImportJobIdError";
  }
}

export class ImportTempPathSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportTempPathSafetyError";
  }
}

export function validateImportJobId(jobId: string): void {
  if (typeof jobId !== "string" || jobId.trim().length === 0) {
    throw new InvalidImportJobIdError("A batch job ID is required.");
  }

  if (
    jobId.includes("..") ||
    jobId.includes("\0") ||
    jobId.includes("/") ||
    jobId.includes("\\")
  ) {
    throw new InvalidImportJobIdError("The batch job ID contains invalid path characters.");
  }

  if (!IMPORT_JOB_ID_PATTERN.test(jobId)) {
    throw new InvalidImportJobIdError("The batch job ID format is invalid.");
  }
}

export function resolveImportTempRootPath(osTempPath: string): string {
  return path.resolve(osTempPath, IMPORT_TEMP_ROOT_DIR_NAME);
}

export function resolveJobTempDirPath(osTempPath: string, jobId: string): string {
  validateImportJobId(jobId);

  const tempRoot = resolveImportTempRootPath(osTempPath);
  const jobDir = path.resolve(tempRoot, jobId);

  if (!isPathInsideImportTempRoot(jobDir, tempRoot)) {
    throw new ImportTempPathSafetyError("The job temp directory path is outside the import temp root.");
  }

  return jobDir;
}

export function isPathInsideImportTempRoot(targetPath: string, tempRootPath: string): boolean {
  const normalizedRoot = path.resolve(tempRootPath);
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

export function isImportJobTempDirName(entryName: string): boolean {
  return IMPORT_JOB_ID_PATTERN.test(entryName);
}
