import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { DocumentReference } from "firebase-admin/firestore";

import type { AssistedCreationProof } from "../../../packages/shared/src/types/assistedCreation/assistedCreation.types";
import {
  selectAssistedCreationProofIdsToPurgeOnTerminal,
  type AssistedCreationProofRetentionView,
} from "../../../packages/shared/src/utils/assistedCreationApprovedProofRetention";

import { adminStorage } from "./admin";
import { storageObjectPath } from "./storageObjectPath";

export function timestampMillis(value: unknown): number | null {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    try {
      const ms = (value as { toMillis: () => number }).toMillis();
      return Number.isFinite(ms) ? ms : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function proofsToRetentionViews(
  proofs: AssistedCreationProof[],
): AssistedCreationProofRetentionView[] {
  return proofs.map((proof) => ({
    id: proof.id,
    storagePath: proof.storagePath,
    fileName: proof.fileName,
    contentType: proof.contentType,
    fullSizePurgedAtMillis: timestampMillis(proof.fullSizePurgedAt),
    ...(proof.kind === "catalog_share" || proof.kind === "proof_image"
      ? { kind: proof.kind }
      : {}),
  }));
}

export async function deleteStorageIfPresent(path: string | null | undefined): Promise<boolean> {
  if (typeof path !== "string" || !path.trim()) {
    return false;
  }
  try {
    await adminStorage.bucket().file(storageObjectPath(path)).delete({ ignoreNotFound: true });
    return true;
  } catch {
    return false;
  }
}

export function markProofsFullSizePurged(
  proofs: AssistedCreationProof[],
  proofIds: Iterable<string>,
  purgedAt: Timestamp = Timestamp.now(),
): AssistedCreationProof[] {
  const ids = new Set([...proofIds].map((id) => id.trim()).filter(Boolean));
  if (ids.size === 0) {
    return proofs;
  }
  return proofs.map((proof) => {
    if (!ids.has(proof.id) || proof.fullSizePurgedAt != null) {
      return proof;
    }
    return { ...proof, fullSizePurgedAt: purgedAt };
  });
}

/**
 * Physically deletes full-res proof objects for the given ids and patches Firestore.
 * Returns how many Storage deletes were attempted successfully.
 */
export async function purgeAssistedCreationProofFullSizeByIds(input: {
  docRef: DocumentReference;
  proofs: AssistedCreationProof[];
  proofIds: string[];
}): Promise<{ storageFilesDeleted: number; nextProofs: AssistedCreationProof[] }> {
  const idSet = new Set(input.proofIds.map((id) => id.trim()).filter(Boolean));
  let storageFilesDeleted = 0;
  for (const proof of input.proofs) {
    if (!idSet.has(proof.id)) {
      continue;
    }
    // Never delete catalog derivatives; catalog_share rows keep storagePath empty.
    if (proof.kind === "catalog_share") {
      continue;
    }
    if (await deleteStorageIfPresent(proof.storagePath)) {
      storageFilesDeleted += 1;
    }
  }
  const nextProofs = markProofsFullSizePurged(input.proofs, idSet);
  await input.docRef.update({
    proofs: nextProofs,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { storageFilesDeleted, nextProofs };
}

export async function purgeAssistedCreationProofsForTerminal(input: {
  docRef: DocumentReference;
  proofs: AssistedCreationProof[];
  terminalKind: "approved" | "rejected_or_cancelled";
  approvedProofId?: string | null;
}): Promise<{ storageFilesDeleted: number; purgedProofIds: string[] }> {
  const purgedProofIds = selectAssistedCreationProofIdsToPurgeOnTerminal({
    terminalKind: input.terminalKind,
    approvedProofId: input.approvedProofId,
    proofs: proofsToRetentionViews(input.proofs),
  });
  if (purgedProofIds.length === 0) {
    return { storageFilesDeleted: 0, purgedProofIds };
  }
  const { storageFilesDeleted } = await purgeAssistedCreationProofFullSizeByIds({
    docRef: input.docRef,
    proofs: input.proofs,
    proofIds: purgedProofIds,
  });
  return { storageFilesDeleted, purgedProofIds };
}
