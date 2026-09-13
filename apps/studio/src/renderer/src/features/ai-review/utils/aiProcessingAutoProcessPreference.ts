const AI_PROCESSING_AUTO_PROCESS_KEY = "fresh-prints.ai-processing.auto-process";

/**
 * Master Auto process preference (localStorage).
 * Default ON when unset — preserves import / reprocess auto-start behavior.
 * Distinct from Auto advance (queue vs one-by-one) and catalog Autonomous.
 */
export function readAiProcessingAutoProcessPreference(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  const raw = window.localStorage.getItem(AI_PROCESSING_AUTO_PROCESS_KEY);
  if (raw === null) {
    return true;
  }

  return raw !== "false";
}

export function writeAiProcessingAutoProcessPreference(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AI_PROCESSING_AUTO_PROCESS_KEY, enabled ? "true" : "false");
}
