import {
  DELETE_ELIGIBLE_UNAPPROVED_DESIGN_CONFIRMATION_PHRASE,
  DELETE_ELIGIBLE_UNAPPROVED_DESIGN_MAX_IDS,
  type DeleteEligibleUnapprovedDesignRequest,
} from "../types/admin/deleteEligibleUnapprovedDesign.types";

export type DeleteEligibleUnapprovedDesignValidationError =
  | "request_required"
  | "design_ids_required"
  | "design_ids_too_many"
  | "design_id_invalid"
  | "confirmation_required"
  | "confirmation_mismatch";

export interface DeleteEligibleUnapprovedDesignValidationResult {
  ok: boolean;
  error?: DeleteEligibleUnapprovedDesignValidationError;
  designIds?: string[];
}

function normalizeDesignId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) {
    return null;
  }

  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

/**
 * Validates callable payload for owner-only hard-delete of eligible unapproved designs.
 * Pure helper — unit tested; Cloud Function and Studio share the same rules.
 */
export function validateDeleteEligibleUnapprovedDesignRequest(
  data: unknown,
): DeleteEligibleUnapprovedDesignValidationResult {
  if (!data || typeof data !== "object") {
    return { ok: false, error: "request_required" };
  }

  const request = data as DeleteEligibleUnapprovedDesignRequest;
  const rawIds = Array.isArray(request.designIds) ? request.designIds : null;

  if (!rawIds || rawIds.length === 0) {
    return { ok: false, error: "design_ids_required" };
  }

  if (rawIds.length > DELETE_ELIGIBLE_UNAPPROVED_DESIGN_MAX_IDS) {
    return { ok: false, error: "design_ids_too_many" };
  }

  const designIds: string[] = [];
  const seen = new Set<string>();

  for (const entry of rawIds) {
    const id = normalizeDesignId(entry);
    if (!id) {
      return { ok: false, error: "design_id_invalid" };
    }

    if (seen.has(id)) {
      continue;
    }

    seen.add(id);
    designIds.push(id);
  }

  if (designIds.length === 0) {
    return { ok: false, error: "design_ids_required" };
  }

  const phrase =
    typeof request.confirmationPhrase === "string" ? request.confirmationPhrase.trim() : "";

  if (!phrase) {
    return { ok: false, error: "confirmation_required" };
  }

  if (phrase !== DELETE_ELIGIBLE_UNAPPROVED_DESIGN_CONFIRMATION_PHRASE) {
    return { ok: false, error: "confirmation_mismatch" };
  }

  return { ok: true, designIds };
}

/** Explicit allowlist — unknown/future statuses denied. */
export const DELETE_ELIGIBLE_UNAPPROVED_DESIGN_STATUSES = ["imported", "processing"] as const;

export type DeleteEligibleUnapprovedDesignStatus =
  (typeof DELETE_ELIGIBLE_UNAPPROVED_DESIGN_STATUSES)[number];

export function isDeleteEligibleUnapprovedDesignStatus(
  status: unknown,
): status is DeleteEligibleUnapprovedDesignStatus {
  return (
    typeof status === "string" &&
    (DELETE_ELIGIBLE_UNAPPROVED_DESIGN_STATUSES as readonly string[]).includes(status)
  );
}

const ACTIVE_AI_PIPELINE_STAGES = new Set([
  "queued",
  "preparing_image",
  "sending_to_ai",
  "receiving_response",
  "validating_response",
]);

export function isActiveAiPipelineStage(stage: unknown): boolean {
  return typeof stage === "string" && ACTIVE_AI_PIPELINE_STAGES.has(stage);
}
