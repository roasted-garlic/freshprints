/**
 * Optional staff-managed artwork garment placement on `designs/{id}` (display label
 * "Placement"). Missing on the document → "Unspecified"; there is no migration/backfill.
 * Shared between Studio (edit surfaces) and Portal (read-only display badge) — see
 * `docs/architecture/DATA_MODEL.md` companion/design section.
 */
export type ArtworkPlacement = "front" | "back" | "front_back" | "pocket" | "sleeve";

export const ARTWORK_PLACEMENT_VALUES: readonly ArtworkPlacement[] = [
  "front",
  "back",
  "front_back",
  "pocket",
  "sleeve",
];

export const ARTWORK_PLACEMENT_UNSPECIFIED_LABEL = "Unspecified";

const ARTWORK_PLACEMENT_LABELS: Record<ArtworkPlacement, string> = {
  front: "Front",
  back: "Back",
  front_back: "Front / Back",
  pocket: "Pocket",
  sleeve: "Sleeve",
};

function isArtworkPlacementValue(value: string): value is ArtworkPlacement {
  return (ARTWORK_PLACEMENT_VALUES as readonly string[]).includes(value);
}

/**
 * Allowlists a raw/unknown persisted value to a known `ArtworkPlacement`. Missing values and
 * anything outside the allowlist (legacy data, corruption, future/removed values) map to
 * `undefined` — the "absent → Unspecified" contract has no migration and must never throw on
 * read.
 */
export function parseArtworkPlacement(value: unknown): ArtworkPlacement | undefined {
  return typeof value === "string" && isArtworkPlacementValue(value) ? value : undefined;
}

/** Display label for a placement value; missing/unknown → "Unspecified". */
export function artworkPlacementLabel(value: unknown): string {
  const parsed = parseArtworkPlacement(value);
  return parsed ? ARTWORK_PLACEMENT_LABELS[parsed] : ARTWORK_PLACEMENT_UNSPECIFIED_LABEL;
}
