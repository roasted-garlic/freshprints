import { FieldValue } from "firebase-admin/firestore";

import {
  SMART_PROFILE_EDITABLE_DIMENSION_KEYS,
  type SmartProfileEditableDimensionKey,
} from "../../../packages/shared/src/constants/smartProfile.constants";
import type {
  DesignSmartProfile,
  SmartProfileDimensionLists,
} from "../../../packages/shared/src/types/catalog/smartProfile.types";
import {
  applyStaffDimensionPatch,
  isSmartProfileEditableDimensionKey,
  resetStaffEditedDimension,
} from "../../../packages/shared/src/utils/smartProfileStaffEdit";
import { normalizeSmartProfileDimensions } from "../../../packages/shared/src/utils/smartProfileNormalization";
import { stripEmptySmartProfileDimensions } from "../ai/smartProfileBuilder";
import { adminDb } from "../lib/admin";
import { failedPrecondition, invalidArgument, permissionDenied } from "../lib/errors";
import { assertOwnerOrAdminCaller } from "../lib/permissions";
import type { TeamUserProfile } from "../lib/types";

export interface UpdateDesignSmartProfileDimensionsRequest {
  designId: string;
  dimensions: Partial<Record<SmartProfileEditableDimensionKey, string[]>>;
}

export interface ResetDesignSmartProfileDimensionRequest {
  designId: string;
  dimensionKey: SmartProfileEditableDimensionKey;
}

export interface DesignSmartProfileMutationResponse {
  designId: string;
  smartProfile: DesignSmartProfile;
}

function assertReadyApprovedWithProfile(designData: Record<string, unknown>): DesignSmartProfile {
  const status = typeof designData.status === "string" ? designData.status : "";
  const aiReviewStatus =
    typeof designData.aiReviewStatus === "string" ? designData.aiReviewStatus : "";
  if (status !== "ready" || aiReviewStatus !== "approved") {
    throw failedPrecondition(
      "Smart Profile edits are only allowed on Ready designs with approved AI review.",
    );
  }

  const smartProfile = designData.smartProfile;
  if (!smartProfile || typeof smartProfile !== "object") {
    throw failedPrecondition(
      "Smart Profile must exist before staff can edit dimensions. Run catalog enrichment first.",
    );
  }

  return smartProfile as DesignSmartProfile;
}

function parseSnapshot(value: unknown): SmartProfileDimensionLists | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const out: SmartProfileDimensionLists = {};
  for (const key of SMART_PROFILE_EDITABLE_DIMENSION_KEYS) {
    const entry = (value as Record<string, unknown>)[key];
    if (Array.isArray(entry)) {
      out[key] = entry.filter((item): item is string => typeof item === "string");
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeDimensionPatch(
  dimensions: Partial<Record<SmartProfileEditableDimensionKey, string[]>>,
): Partial<Record<SmartProfileEditableDimensionKey, string[] | undefined>> {
  const normalized = normalizeSmartProfileDimensions(dimensions);
  const patch: Partial<Record<SmartProfileEditableDimensionKey, string[] | undefined>> = {};
  for (const key of SMART_PROFILE_EDITABLE_DIMENSION_KEYS) {
    if (!(key in dimensions)) {
      continue;
    }
    const values = normalized[key];
    patch[key] = values && values.length > 0 ? values : undefined;
  }
  return patch;
}

function validateDimensionKeys(
  dimensions: Partial<Record<SmartProfileEditableDimensionKey, string[]>>,
): void {
  const keys = Object.keys(dimensions);
  if (keys.length === 0) {
    throw invalidArgument("At least one dimension must be provided.");
  }
  for (const key of keys) {
    if (!isSmartProfileEditableDimensionKey(key)) {
      throw invalidArgument(`Invalid Smart Profile dimension key: ${key}`);
    }
    const values = dimensions[key as SmartProfileEditableDimensionKey];
    if (!Array.isArray(values)) {
      throw invalidArgument(`Dimension ${key} must be an array of strings.`);
    }
  }
}

export async function applyDesignSmartProfileDimensionPatch(input: {
  caller: TeamUserProfile;
  designId: string;
  dimensions: Partial<Record<SmartProfileEditableDimensionKey, string[]>>;
}): Promise<DesignSmartProfileMutationResponse> {
  assertOwnerOrAdminCaller(input.caller);

  const designId = input.designId.trim();
  if (!designId) {
    throw invalidArgument("designId is required.");
  }

  validateDimensionKeys(input.dimensions);

  const designRef = adminDb.collection("designs").doc(designId);
  const snap = await designRef.get();
  if (!snap.exists) {
    throw failedPrecondition("Design not found.");
  }

  const designData = snap.data() ?? {};
  const profile = assertReadyApprovedWithProfile(designData);
  const patch = normalizeDimensionPatch(input.dimensions);
  const editedAtIso = new Date().toISOString();

  const nextProfile = stripEmptySmartProfileDimensions(
    applyStaffDimensionPatch({
      profile,
      dimensions: patch,
      staffUserId: input.caller.id,
      editedAtIso,
    }),
  ) as unknown as DesignSmartProfile;

  await designRef.update({
    smartProfile: nextProfile,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: input.caller.id,
  });

  return { designId, smartProfile: nextProfile };
}

export async function applyDesignSmartProfileDimensionReset(input: {
  caller: TeamUserProfile;
  designId: string;
  dimensionKey: SmartProfileEditableDimensionKey;
}): Promise<DesignSmartProfileMutationResponse> {
  assertOwnerOrAdminCaller(input.caller);

  const designId = input.designId.trim();
  if (!designId) {
    throw invalidArgument("designId is required.");
  }

  if (!isSmartProfileEditableDimensionKey(input.dimensionKey)) {
    throw invalidArgument("Invalid Smart Profile dimension key.");
  }

  const designRef = adminDb.collection("designs").doc(designId);
  const snap = await designRef.get();
  if (!snap.exists) {
    throw failedPrecondition("Design not found.");
  }

  const designData = snap.data() ?? {};
  const profile = assertReadyApprovedWithProfile(designData);
  const snapshot = parseSnapshot(designData.smartProfileAiSnapshot);
  if (!snapshot) {
    throw failedPrecondition("No AI snapshot exists for reset.");
  }

  const editedAtIso = new Date().toISOString();
  const resetProfile = resetStaffEditedDimension({
    profile,
    dimensionKey: input.dimensionKey,
    snapshot,
    staffUserId: input.caller.id,
    editedAtIso,
  });

  if (!resetProfile) {
    throw failedPrecondition("Reset unavailable for this dimension.");
  }

  const nextProfile = stripEmptySmartProfileDimensions(resetProfile) as unknown as DesignSmartProfile;

  await designRef.update({
    smartProfile: nextProfile,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: input.caller.id,
  });

  return { designId, smartProfile: nextProfile };
}

export function assertCallerCanEditSmartProfile(caller: TeamUserProfile): void {
  if (!caller.isActive) {
    throw permissionDenied("Inactive accounts cannot edit Smart Profile metadata.");
  }
  assertOwnerOrAdminCaller(caller);
}
