import path from "node:path";

const allowedValidationPaths = new Set<string>();
const validatedImportPaths = new Set<string>();

export function clearImportFileSession(): void {
  allowedValidationPaths.clear();
  validatedImportPaths.clear();
}

/**
 * Registers the single-file-import session's approved path. Only clears the prior session when a
 * genuinely DIFFERENT path is being registered — re-registering the exact same path (normalized)
 * that is already the active session is a no-op, not a destructive reset.
 *
 * This distinction matters because this whole mechanism is a single, process-global, unscoped
 * session — before this fix, ANY call to registerImportFilePath (including one that would have
 * registered the identical path already in flight) unconditionally wiped
 * allowedValidationPaths/validatedImportPaths via clearImportFileSession(), silently invalidating
 * an in-progress validate-to-upload window with no generation/session identity to distinguish
 * "the same file, still being processed" from "a genuinely new selection."
 *
 * A large/slow file (10800x10800, 159MB) widens the exposure window for any such intervening
 * call by roughly doubling the validation cost (see readSelectedPngFileBytes.ts's now-conditional
 * re-validation) — this made the single-slot fragility far more likely to be hit in practice for
 * large imports specifically, matching the confirmed owner reproduction
 * (post-launch-catalog-and-processing-stability, Owner QA Amendment 1, Workstream 3).
 *
 * Arbitrary-filesystem-path protection is unaffected — this only changes when the SAME already-
 * registered path is treated as a fresh registration vs. a continuation; a genuinely different
 * path still correctly clears and replaces the session (the intended "one file at a time" model).
 */
export function registerImportFilePath(filePath: string): void {
  const normalizedPath = path.normalize(filePath);

  if (allowedValidationPaths.size === 1 && allowedValidationPaths.has(normalizedPath)) {
    return;
  }

  clearImportFileSession();
  allowedValidationPaths.add(normalizedPath);
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
