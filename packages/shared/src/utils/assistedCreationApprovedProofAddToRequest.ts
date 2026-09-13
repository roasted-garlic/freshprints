import { evaluateAssistedCreationApprovedProofDownload } from "./assistedCreationApprovedProofRetention";
import type { AssistedCreationProofRetentionView } from "./assistedCreationApprovedProofRetention";

export type AssistedApprovedProofAddToRequestReason =
  | "not_approved"
  | "missing_approval_fields"
  | "proof_missing"
  | "purged_never_ingested"
  | "full_res_available"
  | "final_source_available"
  | "already_ingested";

export interface AssistedCreationFinalSourceView {
  id: string;
  storagePath: string;
  contentType?: string;
  widthPx?: number | null;
  heightPx?: number | null;
}

export interface AssistedCreationPrintRequestIngestView {
  customerUploadId: string;
  printRequestItemId: string;
  printRequestId: string;
  assistedProofId?: string | null;
}

export interface EvaluateAssistedApprovedProofAddToRequestInput {
  status: string;
  approvedProofId?: string | null;
  approvedAtMillis?: number | null;
  proofs: AssistedCreationProofRetentionView[];
  finalSource?: AssistedCreationFinalSourceView | null;
  /** Denormalized ingest on the assisted request (if any). */
  printRequestIngest?: AssistedCreationPrintRequestIngestView | null;
  nowMs: number;
}

export interface EvaluateAssistedApprovedProofAddToRequestResult {
  eligible: boolean;
  reason: AssistedApprovedProofAddToRequestReason;
  alreadyIngested: boolean;
  proof: AssistedCreationProofRetentionView | null;
}

function hasValidIngest(
  ingest: AssistedCreationPrintRequestIngestView | null | undefined,
): ingest is AssistedCreationPrintRequestIngestView {
  if (!ingest) {
    return false;
  }
  return Boolean(
    ingest.customerUploadId?.trim() &&
      ingest.printRequestItemId?.trim() &&
      ingest.printRequestId?.trim(),
  );
}

/**
 * CTA eligibility for “Add to Request”:
 * - eligible while full-res download is available, or
 * - eligible when already ingested (show Already in request),
 * - hidden when purged and never ingested.
 */
export function evaluateAssistedApprovedProofAddToRequest(
  input: EvaluateAssistedApprovedProofAddToRequestInput,
): EvaluateAssistedApprovedProofAddToRequestResult {
  if (input.status !== "approved") {
    return {
      eligible: false,
      reason: "not_approved",
      alreadyIngested: false,
      proof: null,
    };
  }

  const alreadyIngested = hasValidIngest(input.printRequestIngest);
  if (alreadyIngested) {
    return {
      eligible: true,
      reason: "already_ingested",
      alreadyIngested: true,
      proof: null,
    };
  }

  const finalSourcePath = input.finalSource?.storagePath?.trim() ?? "";
  if (input.status === "approved" && finalSourcePath) {
    return {
      eligible: true,
      reason: "final_source_available",
      alreadyIngested: false,
      proof: null,
    };
  }

  const download = evaluateAssistedCreationApprovedProofDownload({
    status: input.status,
    approvedProofId: input.approvedProofId,
    approvedAtMillis: input.approvedAtMillis,
    proofs: input.proofs,
    nowMs: input.nowMs,
  });

  if (download.eligible && download.proof) {
    return {
      eligible: true,
      reason: "full_res_available",
      alreadyIngested: false,
      proof: download.proof,
    };
  }

  if (
    download.reason === "full_size_purged" ||
    download.reason === "expired" ||
    download.reason === "proof_missing"
  ) {
    return {
      eligible: false,
      reason: "purged_never_ingested",
      alreadyIngested: false,
      proof: download.proof,
    };
  }

  if (download.reason === "missing_approval_fields") {
    return {
      eligible: false,
      reason: "missing_approval_fields",
      alreadyIngested: false,
      proof: null,
    };
  }

  return {
    eligible: false,
    reason: "purged_never_ingested",
    alreadyIngested: false,
    proof: download.proof,
  };
}
