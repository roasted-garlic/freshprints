import type {
  SmartProfileDimensionLists,
  SmartProfileProvenance,
} from "../types/catalog/smartProfile.types";
import { SMART_PROFILE_EDITABLE_DIMENSION_KEYS } from "../constants/smartProfile.constants";

/**
 * Merges Smart Profile import presets with AI-generated Smart Profile data.
 * Import preset values are guaranteed present; AI extras are unioned/deduped.
 */
export function mergeSmartProfileImportPresets(
  aiSmartProfile: SmartProfileDimensionLists & { provenance: SmartProfileProvenance },
  importPresets?: Partial<SmartProfileDimensionLists>,
): SmartProfileDimensionLists & { provenance: SmartProfileProvenance } {
  if (!importPresets || Object.keys(importPresets).length === 0) {
    return aiSmartProfile;
  }

  const filteredPresets: Partial<SmartProfileDimensionLists> = {};
  const appliedPresetKeys: string[] = [];

  for (const key of SMART_PROFILE_EDITABLE_DIMENSION_KEYS) {
    const presetValue = importPresets[key];
    if (presetValue && Array.isArray(presetValue) && presetValue.length > 0) {
      filteredPresets[key] = presetValue;
      appliedPresetKeys.push(key);
    }
  }

  if (appliedPresetKeys.length === 0) {
    return aiSmartProfile;
  }

  const merged: SmartProfileDimensionLists & { provenance: SmartProfileProvenance } = {
    ...aiSmartProfile,
    provenance: {
      ...aiSmartProfile.provenance,
      importPresetDimensionKeys: appliedPresetKeys,
    },
  };

  for (const key of appliedPresetKeys) {
    const aiValues = aiSmartProfile[key as keyof SmartProfileDimensionLists] || [];
    const presetValues = filteredPresets[key as keyof SmartProfileDimensionLists] || [];

    if (Array.isArray(aiValues) && Array.isArray(presetValues)) {
      const combined = [...presetValues];
      for (const aiValue of aiValues) {
        if (!combined.includes(aiValue)) {
          combined.push(aiValue);
        }
      }
      (merged as unknown as Record<string, unknown>)[key] = combined;
    }
  }

  return merged;
}

export function extractImportPresetKeysForSeedRetention(
  smartProfile?: SmartProfileDimensionLists & { provenance: SmartProfileProvenance },
): string[] | undefined {
  if (!smartProfile?.provenance?.importPresetDimensionKeys) {
    return undefined;
  }

  return smartProfile.provenance.importPresetDimensionKeys.length > 0
    ? [...smartProfile.provenance.importPresetDimensionKeys]
    : undefined;
}

export function createImportPresetSeed(
  smartProfile?: SmartProfileDimensionLists & { provenance: SmartProfileProvenance },
): Partial<SmartProfileDimensionLists> | undefined {
  const presetKeys = extractImportPresetKeysForSeedRetention(smartProfile);
  if (!presetKeys || presetKeys.length === 0) {
    return undefined;
  }

  const seed: Partial<SmartProfileDimensionLists> = {};

  for (const key of presetKeys) {
    const value = smartProfile?.[key as keyof SmartProfileDimensionLists];
    if (Array.isArray(value) && value.length > 0) {
      (seed as Record<string, unknown>)[key] = [...value];
    }
  }

  return Object.keys(seed).length > 0 ? seed : undefined;
}

/**
 * Synchronize durable import-preset seed when staff edits/clears dimensions.
 * Only keys already present in the seed (or listed in importPresetDimensionKeys) are updated.
 */
export function syncImportPresetSeedOnStaffEdit(input: {
  seed: Partial<SmartProfileDimensionLists> | null | undefined;
  importPresetDimensionKeys?: string[] | null;
  patch: Partial<Record<(typeof SMART_PROFILE_EDITABLE_DIMENSION_KEYS)[number], string[] | undefined>>;
}): Partial<SmartProfileDimensionLists> | null {
  const tracked = new Set<string>([
    ...Object.keys(input.seed ?? {}),
    ...(input.importPresetDimensionKeys ?? []),
  ]);
  if (tracked.size === 0) {
    return input.seed && Object.keys(input.seed).length > 0 ? { ...input.seed } : null;
  }

  const next: Partial<SmartProfileDimensionLists> = { ...(input.seed ?? {}) };
  for (const key of SMART_PROFILE_EDITABLE_DIMENSION_KEYS) {
    if (!(key in input.patch) || !tracked.has(key)) {
      continue;
    }
    const values = input.patch[key];
    if (!values || values.length === 0) {
      delete next[key];
    } else {
      next[key] = [...values];
    }
  }
  return Object.keys(next).length > 0 ? next : null;
}
