export type AssistedCreationArtworkHistoryKind = "proof" | "final_artwork";

export interface AssistedCreationArtworkHistoryProofInput {
  id: string;
  storagePath?: string | null;
  contentType?: string | null;
  createdAtMillis?: number | null;
  proofNumber: number;
  isApprovedProof: boolean;
  isCatalogShare?: boolean;
  catalogTitle?: string;
}

export interface AssistedCreationArtworkHistoryFinalSourceInput {
  id: string;
  storagePath: string;
  contentType?: string | null;
  fileName?: string | null;
  uploadedAtMillis?: number | null;
}

export interface AssistedCreationArtworkHistoryItem {
  kind: AssistedCreationArtworkHistoryKind;
  id: string;
  label: string;
  storagePath: string;
  contentType: string;
  sortMillis: number;
  isApprovedProof: boolean;
  proofNumber?: number;
  isCatalogShare?: boolean;
  catalogTitle?: string;
}

function resolveMillis(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Compose proof history plus optional Final Artwork for display lists.
 * Newest entries first; Final Artwork is never folded into proofs[].
 */
export function buildAssistedCreationArtworkHistoryNewestFirst(input: {
  proofs: AssistedCreationArtworkHistoryProofInput[];
  finalSource?: AssistedCreationArtworkHistoryFinalSourceInput | null;
}): AssistedCreationArtworkHistoryItem[] {
  const items: AssistedCreationArtworkHistoryItem[] = input.proofs
    .filter((proof) => Boolean(proof.storagePath?.trim()) || proof.isCatalogShare)
    .map((proof) => ({
      kind: "proof" as const,
      id: proof.id,
      label: proof.isCatalogShare
        ? proof.catalogTitle?.trim() || "Design Library"
        : `Proof ${proof.proofNumber}`,
      storagePath: proof.storagePath?.trim() || "",
      contentType: proof.contentType?.trim() || "application/octet-stream",
      sortMillis: resolveMillis(proof.createdAtMillis),
      isApprovedProof: proof.isApprovedProof,
      proofNumber: proof.proofNumber,
      isCatalogShare: proof.isCatalogShare === true,
      catalogTitle: proof.catalogTitle,
    }));

  const finalSource = input.finalSource;
  if (finalSource?.storagePath?.trim()) {
    items.push({
      kind: "final_artwork",
      id: finalSource.id,
      label: "Final Artwork",
      storagePath: finalSource.storagePath.trim(),
      contentType: finalSource.contentType?.trim() || "application/octet-stream",
      sortMillis: resolveMillis(finalSource.uploadedAtMillis),
      isApprovedProof: false,
    });
  }

  return items.sort((a, b) => b.sortMillis - a.sortMillis);
}
