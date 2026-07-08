import path from "node:path";

import { ALLOWED_EXTENSIONS } from "@fresh-prints/shared/constants/importValidation.constants";

export function isUnsafeClientFilePath(filePath: string): boolean {
  if (!filePath.trim()) {
    return true;
  }

  if (filePath.includes("\0")) {
    return true;
  }

  if (filePath.includes("..")) {
    return true;
  }

  return false;
}

export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

export function hasAllowedExtension(filePath: string): boolean {
  const extension = getFileExtension(filePath);

  return ALLOWED_EXTENSIONS.some((allowedExtension) => allowedExtension === extension);
}

export function getFileName(filePath: string): string {
  return path.basename(filePath);
}
