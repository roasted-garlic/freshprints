import type { AssistedCreationProof } from "../types/assistedCreation/assistedCreation.types";

/** True when the proofs-array row is a Design Library recommendation. */
export function isAssistedCreationCatalogShareProof(
  proof: Pick<AssistedCreationProof, "kind"> | null | undefined,
): boolean {
  return proof?.kind === "catalog_share";
}

/** Classic uploaded proof images only (legacy omit ≡ image). */
export function isAssistedCreationImageProof(
  proof: Pick<AssistedCreationProof, "kind"> | null | undefined,
): boolean {
  return !isAssistedCreationCatalogShareProof(proof);
}

/** Count of image proofs — used for `proof-{n}-…` filenames and “Proof N” labels. */
export function countAssistedCreationImageProofs(
  proofs: ReadonlyArray<Pick<AssistedCreationProof, "kind">>,
): number {
  return proofs.filter((proof) => isAssistedCreationImageProof(proof)).length;
}

/**
 * 1-based chronological number among image proofs only.
 * Returns 0 for catalog_share rows or missing ids.
 */
export function chronologicalAssistedCreationImageProofNumber(
  proofsAsc: ReadonlyArray<Pick<AssistedCreationProof, "id" | "kind">>,
  proofId: string,
): number {
  const id = proofId.trim();
  if (!id) {
    return 0;
  }
  let number = 0;
  for (const proof of proofsAsc) {
    if (!isAssistedCreationImageProof(proof)) {
      continue;
    }
    number += 1;
    if (proof.id === id) {
      return number;
    }
  }
  return 0;
}

/**
 * Display title for a Design Library (`catalog_share`) proofs-array row.
 * Shared by Portal + Studio Proofs lists (ADR-FP-108).
 */
export function assistedCreationCatalogShareProofTitle(
  proof: Pick<AssistedCreationProof, "catalogDesignTitle" | "fileName"> | null | undefined,
): string {
  return proof?.catalogDesignTitle?.trim() || proof?.fileName?.trim() || "Design Library";
}
