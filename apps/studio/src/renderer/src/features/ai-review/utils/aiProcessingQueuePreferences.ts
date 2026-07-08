const AI_PROCESSING_AUTO_ADVANCE_KEY = "fresh-prints.ai-processing.auto-advance";

export function readAiProcessingAutoAdvancePreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(AI_PROCESSING_AUTO_ADVANCE_KEY) === "true";
}

export function writeAiProcessingAutoAdvancePreference(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(AI_PROCESSING_AUTO_ADVANCE_KEY, enabled ? "true" : "false");
}
