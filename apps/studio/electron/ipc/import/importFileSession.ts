import path from "node:path";

const allowedValidationPaths = new Set<string>();
const validatedImportPaths = new Set<string>();

export function clearImportFileSession(): void {
  allowedValidationPaths.clear();
  validatedImportPaths.clear();
}

export function registerImportFilePath(filePath: string): void {
  clearImportFileSession();
  allowedValidationPaths.add(path.normalize(filePath));
}

export function markImportFileValidated(filePath: string): void {
  validatedImportPaths.add(path.normalize(filePath));
}

export function isRegisteredImportFilePath(filePath: string): boolean {
  return allowedValidationPaths.has(path.normalize(filePath));
}

export function isValidatedImportFilePath(filePath: string): boolean {
  return validatedImportPaths.has(path.normalize(filePath));
}

export function isSingleFileImportSessionActive(): boolean {
  return allowedValidationPaths.size > 0;
}
