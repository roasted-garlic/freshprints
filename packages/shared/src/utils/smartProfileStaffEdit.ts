import {
  SMART_PROFILE_EDITABLE_DIMENSION_KEYS,
  type SmartProfileEditableDimensionKey,
} from "../constants/smartProfile.constants";
import type {
  DesignSmartProfile,
  SmartProfileDimensionLists,
} from "../types/catalog/smartProfile.types";

const EDITABLE_KEY_SET = new Set<string>(SMART_PROFILE_EDITABLE_DIMENSION_KEYS);

export function isSmartProfileEditableDimensionKey(
  value: unknown,
): value is SmartProfileEditableDimensionKey {
  return typeof value === "string" && EDITABLE_KEY_SET.has(value);
}

export function parseStaffEditedDimensionKeys(
  value: unknown,
): SmartProfileEditableDimensionKey[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const result: SmartProfileEditableDimensionKey[] = [];
  for (const entry of value) {
    if (isSmartProfileEditableDimensionKey(entry) && !seen.has(entry)) {
      seen.add(entry);
      result.push(entry);
    }
  }
  return result;
}

export function extractSmartProfileDimensionLists(
  profile: DesignSmartProfile | SmartProfileDimensionLists | null | undefined,
): SmartProfileDimensionLists {
  if (!profile || typeof profile !== "object") {
    return {};
  }
  const out: SmartProfileDimensionLists = {};
  for (const key of SMART_PROFILE_EDITABLE_DIMENSION_KEYS) {
    const value = profile[key];
    if (Array.isArray(value)) {
      out[key] = value.filter((item): item is string => typeof item === "string");
    }
  }
  return out;
}

/** Merge AI-generated dimensions with staff-preserved dimensions for ready_backfill. */
export function mergeAiSmartProfileWithStaffPreserved(input: {
  aiProfile: DesignSmartProfile;
  priorProfile: DesignSmartProfile | null | undefined;
  staffEditedDimensionKeys: SmartProfileEditableDimensionKey[];
}): DesignSmartProfile {
  const merged: DesignSmartProfile = {
    ...input.aiProfile,
    provenance: { ...input.aiProfile.provenance },
  };

  if (!input.priorProfile || input.staffEditedDimensionKeys.length === 0) {
    return merged;
  }

  if (input.priorProfile.provenance) {
    merged.provenance = {
      ...merged.provenance,
      staffEditedDimensionKeys: input.staffEditedDimensionKeys,
      staffEditedAt: input.priorProfile.provenance.staffEditedAt,
      staffEditedBy: input.priorProfile.provenance.staffEditedBy,
    };
  }

  for (const key of input.staffEditedDimensionKeys) {
    const preserved = input.priorProfile[key];
    if (Array.isArray(preserved)) {
      merged[key] = preserved.filter((item): item is string => typeof item === "string");
    } else {
      delete merged[key];
    }
  }

  return merged;
}

export function applyStaffDimensionPatch(input: {
  profile: DesignSmartProfile;
  dimensions: Partial<Record<SmartProfileEditableDimensionKey, string[] | undefined>>;
  staffUserId: string;
  editedAtIso: string;
}): DesignSmartProfile {
  const next: DesignSmartProfile = {
    ...input.profile,
    provenance: { ...input.profile.provenance },
  };

  const editedKeys = new Set(parseStaffEditedDimensionKeys(next.provenance.staffEditedDimensionKeys));

  for (const key of SMART_PROFILE_EDITABLE_DIMENSION_KEYS) {
    if (!(key in input.dimensions)) {
      continue;
    }
    const values = input.dimensions[key];
    if (values === undefined) {
      delete next[key];
    } else if (values.length === 0) {
      delete next[key];
    } else {
      next[key] = values;
      editedKeys.add(key);
    }
  }

  next.provenance.staffEditedDimensionKeys = [...editedKeys];
  next.provenance.staffEditedAt = input.editedAtIso;
  next.provenance.staffEditedBy = input.staffUserId;

  return next;
}

export function resetStaffEditedDimension(input: {
  profile: DesignSmartProfile;
  dimensionKey: SmartProfileEditableDimensionKey;
  snapshot: SmartProfileDimensionLists | null | undefined;
  staffUserId: string;
  editedAtIso: string;
}): DesignSmartProfile | null {
  if (!input.snapshot) {
    return null;
  }

  const next: DesignSmartProfile = {
    ...input.profile,
    provenance: { ...input.profile.provenance },
  };

  const snapshotValues = input.snapshot[input.dimensionKey];
  if (Array.isArray(snapshotValues) && snapshotValues.length > 0) {
    next[input.dimensionKey] = snapshotValues;
  } else {
    delete next[input.dimensionKey];
  }

  const editedKeys = parseStaffEditedDimensionKeys(next.provenance.staffEditedDimensionKeys).filter(
    (key) => key !== input.dimensionKey,
  );
  if (editedKeys.length > 0) {
    next.provenance.staffEditedDimensionKeys = editedKeys;
  } else {
    delete next.provenance.staffEditedDimensionKeys;
  }
  next.provenance.staffEditedAt = input.editedAtIso;
  next.provenance.staffEditedBy = input.staffUserId;

  return next;
}
