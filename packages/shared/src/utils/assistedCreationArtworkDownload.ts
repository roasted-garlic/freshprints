export type AssistedCreationArtworkDownloadTarget = "final_artwork" | "approved_proof";

export function parseAssistedCreationArtworkDownloadTarget(
  value: unknown,
): AssistedCreationArtworkDownloadTarget | null {
  if (value === "final_artwork" || value === "approved_proof") {
    return value;
  }
  return null;
}
