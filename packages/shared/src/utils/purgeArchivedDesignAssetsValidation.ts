import {
  PURGE_ARCHIVED_DESIGN_ASSETS_CONFIRMATION_PHRASE,
  PURGE_ARCHIVED_DESIGN_ASSETS_MAX_IDS,
  type PurgeArchivedDesignAssetsRequest,
} from "../types/admin/purgeArchivedDesignAssets.types";

export type PurgeArchivedDesignAssetsValidationError =
  | "request_required"
  | "design_ids_required"
  | "design_ids_too_many"
  | "design_id_invalid"
  | "bulk_confirmation_required"
  | "bulk_confirmation_mismatch";

export interface PurgeArchivedDesignAssetsValidationResult {
  ok: boolean;
  error?: PurgeArchivedDesignAssetsValidationError;
  designIds?: string[];
  confirmActiveQueue?: boolean;
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
 * Validates callable payload for owner archive-first asset purge.
 * Pure helper — unit tested; Cloud Function and Studio share the same rules.
 */
export function validatePurgeArchivedDesignAssetsRequest(
  data: unknown,
): PurgeArchivedDesignAssetsValidationResult {
  if (!data || typeof data !== "object") {
    return { ok: false, error: "request_required" };
  }

  const request = data as PurgeArchivedDesignAssetsRequest;
  const rawIds = Array.isArray(request.designIds) ? request.designIds : null;

  if (!rawIds || rawIds.length === 0) {
    return { ok: false, error: "design_ids_required" };
  }

  if (rawIds.length > PURGE_ARCHIVED_DESIGN_ASSETS_MAX_IDS) {
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

  if (designIds.length > 1) {
    const phrase =
      typeof request.confirmationPhrase === "string" ? request.confirmationPhrase.trim() : "";

    if (!phrase) {
      return { ok: false, error: "bulk_confirmation_required" };
    }

    if (phrase !== PURGE_ARCHIVED_DESIGN_ASSETS_CONFIRMATION_PHRASE) {
      return { ok: false, error: "bulk_confirmation_mismatch" };
    }
  }

  return {
    ok: true,
    designIds,
    confirmActiveQueue: request.confirmActiveQueue === true,
  };
}

export function isDesignAssetsPurged(data: { assetsPurgedAt?: unknown } | null | undefined): boolean {
  return data?.assetsPurgedAt != null;
}
