const AI_PROCESSING_AUTO_ADVANCE_KEY = "fresh-prints.ai-processing.auto-advance";

/**
 * Auto advance defaults ON when unset (ADR-FP-014 amendment 2026-07-13).
 * Explicit `"false"` disables; `"true"` enables.
 */
export function readAiProcessingAutoAdvancePreference(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  const raw = window.sessionStorage.getItem(AI_PROCESSING_AUTO_ADVANCE_KEY);
  if (raw === null) {
    return true;
  }

  return raw !== "false";
}

export function writeAiProcessingAutoAdvancePreference(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(AI_PROCESSING_AUTO_ADVANCE_KEY, enabled ? "true" : "false");
}
