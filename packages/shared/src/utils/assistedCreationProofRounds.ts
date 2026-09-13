import {
  ASSISTED_CREATION_ALLOWED_PROOF_TYPES,
  ASSISTED_CREATION_MAX_PROOF_BYTES,
  ASSISTED_CREATION_MAX_PROOF_OPTIONS_PER_ROUND,
  ASSISTED_CREATION_MAX_PROOF_ROUND_TOTAL_BYTES,
} from "../constants/assistedCreation/assistedCreation.constants";
import type { AssistedCreationProof } from "../types/assistedCreation/assistedCreation.types";

export function deriveAssistedCreationProofOptionLabel(optionOrder: number): string {
  if (!Number.isInteger(optionOrder) || optionOrder < 0 || optionOrder > 25) {
    return `Option ${optionOrder + 1}`;
  }
  return `Option ${String.fromCharCode(65 + optionOrder)}`;
}

export function isAssistedCreationProofFullSizePurged(proof: Pick<AssistedCreationProof, "fullSizePurgedAt">): boolean {
  return proof.fullSizePurgedAt != null;
}

/**
 * Options for the active customer-facing round, ordered by optionOrder then array index.
 * Legacy proofs without round metadata form an implicit one-option round from the latest
 * proof_image (or last proof) when no currentProofRoundId is set.
 */
export function resolveAssistedCreationCurrentRoundOptions(input: {
  proofs: readonly AssistedCreationProof[];
  currentProofRoundId?: string | null;
}): { proofRoundId: string | null; options: AssistedCreationProof[] } {
  const proofs = Array.isArray(input.proofs) ? [...input.proofs] : [];
  const currentRoundId =
    typeof input.currentProofRoundId === "string" && input.currentProofRoundId.trim()
      ? input.currentProofRoundId.trim()
      : null;

  if (currentRoundId) {
    const options = proofs
      .filter((proof) => proof.proofRoundId === currentRoundId)
      .sort((a, b) => {
        const ao = typeof a.optionOrder === "number" ? a.optionOrder : Number.MAX_SAFE_INTEGER;
        const bo = typeof b.optionOrder === "number" ? b.optionOrder : Number.MAX_SAFE_INTEGER;
        if (ao !== bo) {
          return ao - bo;
        }
        return proofs.indexOf(a) - proofs.indexOf(b);
      });
    return { proofRoundId: currentRoundId, options };
  }

  // Legacy: no current round pointer — treat latest image proof (or last row) as sole option.
  for (let i = proofs.length - 1; i >= 0; i -= 1) {
    const proof = proofs[i];
    if (!proof) {
      continue;
    }
    if (proof.kind === "catalog_share") {
      continue;
    }
    const roundId = typeof proof.proofRoundId === "string" ? proof.proofRoundId.trim() : "";
    if (roundId) {
      const options = proofs
        .filter((entry) => entry.proofRoundId === roundId)
        .sort((a, b) => {
          const ao = typeof a.optionOrder === "number" ? a.optionOrder : Number.MAX_SAFE_INTEGER;
          const bo = typeof b.optionOrder === "number" ? b.optionOrder : Number.MAX_SAFE_INTEGER;
          return ao - bo;
        });
      return { proofRoundId: roundId, options };
    }
    return { proofRoundId: null, options: [proof] };
  }

  const last = proofs.length > 0 ? proofs[proofs.length - 1] : null;
  return { proofRoundId: null, options: last ? [last] : [] };
}

export interface NormalizedStaffProofOptionInput {
  id: string;
  storagePath: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  note?: string;
}

export function normalizeStaffAssistedCreationProofBatch(input: {
  proof?: unknown;
  proofs?: unknown;
}): NormalizedStaffProofOptionInput[] {
  const fromArray = Array.isArray(input.proofs) ? input.proofs : null;
  const rawList =
    fromArray && fromArray.length > 0
      ? fromArray
      : input.proof && typeof input.proof === "object"
        ? [input.proof]
        : [];

  if (rawList.length === 0) {
    throw new Error("Proof details are required.");
  }
  if (rawList.length > ASSISTED_CREATION_MAX_PROOF_OPTIONS_PER_ROUND) {
    throw new Error(
      `At most ${ASSISTED_CREATION_MAX_PROOF_OPTIONS_PER_ROUND} proof options can be sent in one round.`,
    );
  }

  const seenIds = new Set<string>();
  const seenPaths = new Set<string>();
  let totalBytes = 0;
  const normalized: NormalizedStaffProofOptionInput[] = [];

  for (const raw of rawList) {
    if (!raw || typeof raw !== "object") {
      throw new Error("Proof metadata is incomplete.");
    }
    const record = raw as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const storagePath = typeof record.storagePath === "string" ? record.storagePath.trim() : "";
    const fileName = typeof record.fileName === "string" ? record.fileName.trim() : "";
    const contentType = typeof record.contentType === "string" ? record.contentType.trim() : "";
    const sizeBytes =
      typeof record.sizeBytes === "number" && Number.isFinite(record.sizeBytes)
        ? Math.floor(record.sizeBytes)
        : -1;
    const note =
      typeof record.note === "string" && record.note.trim() ? record.note.trim() : undefined;

    if (!id || !storagePath || !fileName || !contentType || sizeBytes <= 0) {
      throw new Error("Proof metadata is incomplete.");
    }
    if (!(ASSISTED_CREATION_ALLOWED_PROOF_TYPES as readonly string[]).includes(contentType)) {
      throw new Error("Proof must be JPEG, PNG, or WebP.");
    }
    if (sizeBytes > ASSISTED_CREATION_MAX_PROOF_BYTES) {
      throw new Error("Proof file is too large.");
    }
    if (seenIds.has(id) || seenPaths.has(storagePath)) {
      throw new Error("Duplicate proof id or storage path in this round.");
    }
    seenIds.add(id);
    seenPaths.add(storagePath);
    totalBytes += sizeBytes;
    if (totalBytes > ASSISTED_CREATION_MAX_PROOF_ROUND_TOTAL_BYTES) {
      throw new Error("This proof round exceeds the maximum total file size.");
    }
    normalized.push({
      id,
      storagePath,
      fileName,
      contentType,
      sizeBytes,
      ...(note ? { note } : {}),
    });
  }

  return normalized;
}
