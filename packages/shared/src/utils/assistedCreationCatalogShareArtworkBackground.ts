import { normalizeArtworkBackgroundHex } from "../constants/design/artworkBackground.constants";

/**
 * Snapshot a design's artwork mat for Assisted catalog-share records.
 * Returns `#rrggbb` or `undefined` when missing/invalid (UI uses default mat).
 * Call only with authoritative design-document values — never trust client-supplied hex.
 */
export function snapshotAssistedCatalogArtworkBackgroundHex(
  authoritativeDesignArtworkBackgroundHex: unknown,
): string | undefined {
  return normalizeArtworkBackgroundHex(authoritativeDesignArtworkBackgroundHex) ?? undefined;
}

/**
 * Build optional Firestore snapshot fields written by staffSuggestAssistedCreationCatalogDesign.
 * Client-supplied background values must not be passed into this helper.
 */
export function buildAssistedCatalogShareArtworkBackgroundSnapshots(
  authoritativeDesignArtworkBackgroundHex: unknown,
): {
  artworkBackgroundHex?: string;
  catalogArtworkBackgroundHex?: string;
} {
  const hex = snapshotAssistedCatalogArtworkBackgroundHex(
    authoritativeDesignArtworkBackgroundHex,
  );
  if (!hex) {
    return {};
  }
  return {
    artworkBackgroundHex: hex,
    catalogArtworkBackgroundHex: hex,
  };
}

/**
 * Resolve display mat for Assisted catalog-share UI.
 * Preference: suggestion snapshot → proof snapshot → live ready-design hex.
 * Returns `undefined` when none are valid — callers use theme/default mat.
 */
export function resolveAssistedCatalogShareArtworkBackgroundHex(input: {
  suggestedArtworkBackgroundHex?: unknown;
  proofCatalogArtworkBackgroundHex?: unknown;
  liveDesignArtworkBackgroundHex?: unknown;
}): string | undefined {
  return (
    normalizeArtworkBackgroundHex(input.suggestedArtworkBackgroundHex) ??
    normalizeArtworkBackgroundHex(input.proofCatalogArtworkBackgroundHex) ??
    normalizeArtworkBackgroundHex(input.liveDesignArtworkBackgroundHex) ??
    undefined
  );
}

/**
 * True when a live one-shot design read is needed (legacy shares without snapshots).
 * Does not imply a listener — callers must use bounded get-by-id only.
 */
export function needsAssistedCatalogShareArtworkBackgroundLiveResolve(input: {
  suggestedArtworkBackgroundHex?: unknown;
  proofCatalogArtworkBackgroundHex?: unknown;
}): boolean {
  return (
    resolveAssistedCatalogShareArtworkBackgroundHex({
      suggestedArtworkBackgroundHex: input.suggestedArtworkBackgroundHex,
      proofCatalogArtworkBackgroundHex: input.proofCatalogArtworkBackgroundHex,
    }) === undefined
  );
}
