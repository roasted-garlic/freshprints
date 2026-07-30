export type GeneratedReadyDesignLoadResult<Entry, Fallback> =
  | { source: "generated"; entries: Entry[] }
  | { source: "firestore-fallback"; entries: Fallback[] }
  | { source: "unavailable"; entries: [] };

export async function loadGeneratedReadyDesignsWithVerifiedFallback<Entry, Fallback>(input: {
  loadGenerated: () => Promise<Entry[]>;
  loadFirestoreFallback?: () => Promise<Fallback[]>;
  shouldActivateFallback?: () => boolean;
}): Promise<GeneratedReadyDesignLoadResult<Entry, Fallback>> {
  try {
    return { source: "generated", entries: await input.loadGenerated() };
  } catch {
    if (
      !input.loadFirestoreFallback ||
      (input.shouldActivateFallback && !input.shouldActivateFallback())
    ) {
      return { source: "unavailable", entries: [] };
    }
    try {
      return { source: "firestore-fallback", entries: await input.loadFirestoreFallback() };
    } catch {
      return { source: "firestore-fallback", entries: [] };
    }
  }
}
