import type { DesignSmartProfile, SmartProfileDimensionLists } from "../../../packages/shared/src/types/catalog/smartProfile.types";
import { SMART_PROFILE_EDITABLE_DIMENSION_KEYS } from "../../../packages/shared/src/constants/smartProfile.constants";
import {
  mergeAiSmartProfileWithStaffPreserved,
  parseStaffEditedDimensionKeys,
} from "../../../packages/shared/src/utils/smartProfileStaffEdit";
import { mergeSmartProfileImportPresets } from "../../../packages/shared/src/utils/smartProfileImportPresets";
import { stripEmptySmartProfileDimensions } from "./smartProfileBuilder";

export function buildSmartProfileAiSnapshot(
  profile: DesignSmartProfile | undefined,
): SmartProfileDimensionLists | undefined {
  if (!profile) {
    return undefined;
  }
  const snapshot: SmartProfileDimensionLists = {};
  const keys = [
    "subjects",
    "objects",
    "styles",
    "themes",
    "interests",
    "professionsGroups",
    "occasions",
    "places",
    "colors",
    "visibleText",
    "searchConcepts",
  ] as const;
  for (const key of keys) {
    const value = profile[key];
    if (Array.isArray(value) && value.length > 0) {
      snapshot[key] = value.filter((item): item is string => typeof item === "string");
    }
  }
  return Object.keys(snapshot).length > 0 ? snapshot : undefined;
}

export function parseImportPresetSeed(value: unknown): Partial<SmartProfileDimensionLists> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const out: Partial<SmartProfileDimensionLists> = {};
  for (const key of [
    "subjects",
    "objects",
    "styles",
    "themes",
    "interests",
    "professionsGroups",
    "occasions",
    "places",
    "colors",
    "visibleText",
    "searchConcepts",
  ] as const) {
    const entry = (value as Record<string, unknown>)[key];
    if (Array.isArray(entry) && entry.length > 0) {
      out[key] = entry.filter((item): item is string => typeof item === "string");
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Queue-mode: AI profile + durable import presets (presets guaranteed present). */
export function mergeQueueSmartProfileWithImportPresets(input: {
  aiProfile: DesignSmartProfile;
  importPresets: Partial<SmartProfileDimensionLists> | null | undefined;
}): DesignSmartProfile {
  if (!input.importPresets || Object.keys(input.importPresets).length === 0) {
    return input.aiProfile;
  }
  return mergeSmartProfileImportPresets(input.aiProfile, input.importPresets) as DesignSmartProfile;
}

export function mergeReadyBackfillSmartProfile(input: {
  aiProfile: DesignSmartProfile;
  priorProfile: DesignSmartProfile | null | undefined;
  importPresets?: Partial<SmartProfileDimensionLists> | null;
}): { smartProfile: DesignSmartProfile; smartProfileAiSnapshot: SmartProfileDimensionLists | undefined } {
  const withPresets = mergeQueueSmartProfileWithImportPresets({
    aiProfile: input.aiProfile,
    importPresets: input.importPresets,
  });
  const staffKeys = parseStaffEditedDimensionKeys(input.priorProfile?.provenance?.staffEditedDimensionKeys);
  const aiSnapshot = buildSmartProfileAiSnapshot(input.aiProfile);
  const merged = mergeAiSmartProfileWithStaffPreserved({
    aiProfile: withPresets,
    priorProfile: input.priorProfile,
    staffEditedDimensionKeys: staffKeys,
  });
  return {
    smartProfile: stripEmptySmartProfileDimensions(merged) as unknown as DesignSmartProfile,
    smartProfileAiSnapshot: aiSnapshot,
  };
}

/**
 * Builds the effective Smart Profile when a valid successful result contains no AI profile.
 * Only durable human/import authority survives; AI-owned dimensions and provenance do not.
 */
export function buildSmartProfileWithHumanAuthorityOnly(input: {
  priorProfile: DesignSmartProfile | null | undefined;
  importPresets?: Partial<SmartProfileDimensionLists> | null;
}): DesignSmartProfile | undefined {
  const prior = input.priorProfile;
  if (!prior) {
    return undefined;
  }

  const staffEditedKeys = parseStaffEditedDimensionKeys(
    prior.provenance?.staffEditedDimensionKeys,
  );
  const staffEditedKeySet = new Set(staffEditedKeys);
  const importPresetKeys = SMART_PROFILE_EDITABLE_DIMENSION_KEYS.filter((key) => {
    const values = input.importPresets?.[key];
    return Array.isArray(values) && values.length > 0;
  });
  const next: DesignSmartProfile = {
    provenance: {
      version: prior.provenance?.version ?? "smart-profile-v1",
      ...(staffEditedKeys.length > 0
        ? { staffEditedDimensionKeys: staffEditedKeys }
        : {}),
      ...(prior.provenance?.staffEditedAt
        ? { staffEditedAt: prior.provenance.staffEditedAt }
        : {}),
      ...(prior.provenance?.staffEditedBy
        ? { staffEditedBy: prior.provenance.staffEditedBy }
        : {}),
      ...(importPresetKeys.length > 0
        ? { importPresetDimensionKeys: importPresetKeys }
        : {}),
    },
  };

  for (const key of SMART_PROFILE_EDITABLE_DIMENSION_KEYS) {
    const priorValues = prior[key];
    if (staffEditedKeySet.has(key)) {
      if (Array.isArray(priorValues) && priorValues.length > 0) {
        next[key] = priorValues.filter((value): value is string => typeof value === "string");
      }
      continue;
    }

    const presetValues = input.importPresets?.[key];
    if (Array.isArray(presetValues) && presetValues.length > 0) {
      next[key] = presetValues.filter((value): value is string => typeof value === "string");
    }
  }

  return stripEmptySmartProfileDimensions(next) as unknown as DesignSmartProfile;
}
