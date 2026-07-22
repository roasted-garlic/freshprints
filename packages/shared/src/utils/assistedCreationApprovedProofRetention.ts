import { ASSISTED_CREATION_APPROVED_PROOF_RETENTION_DAYS } from "../constants/assistedCreation/assistedCreation.constants";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type AssistedCreationApprovedProofDownloadReason =
  | "not_approved"
  | "missing_approval_fields"
  | "proof_missing"
  | "full_size_purged"
  | "expired"
  | "eligible";

export type AssistedCreationApprovedProofPurgeReason =
  | "not_approved"
  | "missing_approval_fields"
  | "proof_missing"
  | "already_purged"
  | "cool_off_not_elapsed"
  | "eligible";

export interface AssistedCreationProofRetentionView {
  id: string;
  storagePath?: string | null;
  fileName?: string | null;
  contentType?: string | null;
  fullSizePurgedAtMillis?: number | null;
  /** When `catalog_share`, never purge Storage (no assisted proof object). */
  kind?: "proof_image" | "catalog_share";
}

export interface AssistedCreationApprovedProofDownloadInput {
  status: string;
  approvedProofId?: string | null;
  approvedAtMillis?: number | null;
  proofs: AssistedCreationProofRetentionView[];
  nowMs: number;
  retentionDays?: number;
}

export interface AssistedCreationApprovedProofDownloadResult {
  eligible: boolean;
  reason: AssistedCreationApprovedProofDownloadReason;
  expiresAtMillis: number | null;
  proof: AssistedCreationProofRetentionView | null;
}

export interface AssistedCreationApprovedProofPurgeInput {
  status: string;
  approvedProofId?: string | null;
  approvedAtMillis?: number | null;
  proofs: AssistedCreationProofRetentionView[];
  nowMs: number;
  retentionDays?: number;
}

export interface AssistedCreationApprovedProofPurgeResult {
  eligible: boolean;
  reason: AssistedCreationApprovedProofPurgeReason;
  proof: AssistedCreationProofRetentionView | null;
}

export function assistedCreationApprovedProofExpiresAtMillis(
  approvedAtMillis: number,
  retentionDays: number = ASSISTED_CREATION_APPROVED_PROOF_RETENTION_DAYS,
): number {
  return approvedAtMillis + retentionDays * MS_PER_DAY;
}

function findProof(
  proofs: AssistedCreationProofRetentionView[],
  proofId: string | null | undefined,
): AssistedCreationProofRetentionView | null {
  const id = typeof proofId === "string" ? proofId.trim() : "";
  if (!id) {
    return null;
  }
  return proofs.find((proof) => proof.id === id) ?? null;
}

/**
 * Resolve which proof is the approved download target.
 * Prefer `approvedProofId`; for legacy approved docs without it, use the last proof
 * (same pin as approve-time behavior).
 */
export function resolveAssistedCreationApprovedProofId(
  approvedProofId: string | null | undefined,
  proofs: AssistedCreationProofRetentionView[],
): string {
  const explicit = typeof approvedProofId === "string" ? approvedProofId.trim() : "";
  if (explicit && proofs.some((proof) => proof.id === explicit)) {
    return explicit;
  }
  for (let index = proofs.length - 1; index >= 0; index -= 1) {
    const id = proofs[index]?.id?.trim() || "";
    if (id) {
      return id;
    }
  }
  return "";
}

/**
 * Portal download eligibility for the approved proof full-res object.
 *
 * - With `approvedAt`: eligible within the 14-day window.
 * - Legacy approved docs missing `approvedAt` / `approvedProofId`: still eligible while the
 *   Storage object remains (status approved + file present). Purge stays fail-closed without
 *   `approvedAt` so those objects are not auto-deleted.
 */
export function evaluateAssistedCreationApprovedProofDownload(
  input: AssistedCreationApprovedProofDownloadInput,
): AssistedCreationApprovedProofDownloadResult {
  if (input.status !== "approved") {
    return { eligible: false, reason: "not_approved", expiresAtMillis: null, proof: null };
  }

  const approvedProofId = resolveAssistedCreationApprovedProofId(
    input.approvedProofId,
    input.proofs,
  );
  if (!approvedProofId) {
    return {
      eligible: false,
      reason: "missing_approval_fields",
      expiresAtMillis: null,
      proof: null,
    };
  }

  const proof = findProof(input.proofs, approvedProofId);
  if (!proof) {
    return { eligible: false, reason: "proof_missing", expiresAtMillis: null, proof: null };
  }

  if (proof.fullSizePurgedAtMillis != null) {
    return { eligible: false, reason: "full_size_purged", expiresAtMillis: null, proof };
  }

  const storagePath = proof.storagePath?.trim() || "";
  if (!storagePath) {
    return { eligible: false, reason: "full_size_purged", expiresAtMillis: null, proof };
  }

  const approvedAtMillis = input.approvedAtMillis;
  const hasApprovedAt = approvedAtMillis != null && Number.isFinite(approvedAtMillis);
  if (!hasApprovedAt) {
    // Legacy pre-feature approvals: allow download while the object still exists.
    return { eligible: true, reason: "eligible", expiresAtMillis: null, proof };
  }

  const retentionDays = input.retentionDays ?? ASSISTED_CREATION_APPROVED_PROOF_RETENTION_DAYS;
  const expiresAtMillis = assistedCreationApprovedProofExpiresAtMillis(
    approvedAtMillis,
    retentionDays,
  );

  if (input.nowMs >= expiresAtMillis) {
    return { eligible: false, reason: "expired", expiresAtMillis, proof };
  }

  return { eligible: true, reason: "eligible", expiresAtMillis, proof };
}

/** True when the approved proof full-res should be physically deleted (14-day job). */
export function evaluateAssistedCreationApprovedProofPurge(
  input: AssistedCreationApprovedProofPurgeInput,
): AssistedCreationApprovedProofPurgeResult {
  if (input.status !== "approved") {
    return { eligible: false, reason: "not_approved", proof: null };
  }

  const approvedProofId = input.approvedProofId?.trim() || "";
  const approvedAtMillis = input.approvedAtMillis;
  if (!approvedProofId || approvedAtMillis == null || !Number.isFinite(approvedAtMillis)) {
    return { eligible: false, reason: "missing_approval_fields", proof: null };
  }

  const proof = findProof(input.proofs, approvedProofId);
  if (!proof) {
    return { eligible: false, reason: "proof_missing", proof: null };
  }

  if (proof.fullSizePurgedAtMillis != null || !(proof.storagePath?.trim())) {
    return { eligible: false, reason: "already_purged", proof };
  }

  const retentionDays = input.retentionDays ?? ASSISTED_CREATION_APPROVED_PROOF_RETENTION_DAYS;
  const expiresAtMillis = assistedCreationApprovedProofExpiresAtMillis(
    approvedAtMillis,
    retentionDays,
  );
  if (input.nowMs < expiresAtMillis) {
    return { eligible: false, reason: "cool_off_not_elapsed", proof };
  }

  return { eligible: true, reason: "eligible", proof };
}

/**
 * Proof ids whose full-res Storage objects should be deleted when a request reaches
 * a terminal status (approve keeps only approvedProofId).
 */
export function selectAssistedCreationProofIdsToPurgeOnTerminal(input: {
  terminalKind: "approved" | "rejected_or_cancelled";
  approvedProofId?: string | null;
  proofs: AssistedCreationProofRetentionView[];
}): string[] {
  const keepId =
    input.terminalKind === "approved" ? input.approvedProofId?.trim() || "" : "";

  return input.proofs
    .filter((proof) => {
      if (!proof.id?.trim()) {
        return false;
      }
      if (proof.kind === "catalog_share") {
        return false;
      }
      if (keepId && proof.id === keepId) {
        return false;
      }
      if (proof.fullSizePurgedAtMillis != null) {
        return false;
      }
      return Boolean(proof.storagePath?.trim());
    })
    .map((proof) => proof.id);
}

export function isAssistedCreationProofPng(contentType: string | null | undefined): boolean {
  return (contentType ?? "").trim().toLowerCase() === "image/png";
}
