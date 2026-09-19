export const AI_PROCESSING_AUTO_ADVANCE_KEY = "fresh-prints.ai-processing.auto-advance";

function parseStoredPreference(raw: string | null): boolean | undefined {
  if (raw === "false") {
    return false;
  }

  if (raw === "true") {
    return true;
  }

  return undefined;
}

/**
 * Auto advance is a durable Studio-local workspace preference.
 * It defaults ON when unset (ADR-FP-014 amendment 2026-07-13). Explicit `"false"` disables;
 * `"true"` enables. A valid legacy sessionStorage value is migrated when no valid localStorage
 * value exists so an existing owner choice survives the storage-scope correction.
 */
export function readAiProcessingAutoAdvancePreference(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  const localValue = parseStoredPreference(
    window.localStorage.getItem(AI_PROCESSING_AUTO_ADVANCE_KEY),
  );
  if (localValue !== undefined) {
    return localValue;
  }

  const legacySessionValue = parseStoredPreference(
    window.sessionStorage.getItem(AI_PROCESSING_AUTO_ADVANCE_KEY),
  );
  if (legacySessionValue !== undefined) {
    window.localStorage.setItem(
      AI_PROCESSING_AUTO_ADVANCE_KEY,
      legacySessionValue ? "true" : "false",
    );
    return legacySessionValue;
  }

  return true;
}

export function writeAiProcessingAutoAdvancePreference(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AI_PROCESSING_AUTO_ADVANCE_KEY, enabled ? "true" : "false");
}
