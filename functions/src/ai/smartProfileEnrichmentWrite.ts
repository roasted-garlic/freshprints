import type { DesignSmartProfile, SmartProfileDimensionLists } from "../../../packages/shared/src/types/catalog/smartProfile.types";
import {
  mergeAiSmartProfileWithStaffPreserved,
  parseStaffEditedDimensionKeys,
} from "../../../packages/shared/src/utils/smartProfileStaffEdit";
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

export function mergeReadyBackfillSmartProfile(input: {
  aiProfile: DesignSmartProfile;
  priorProfile: DesignSmartProfile | null | undefined;
}): { smartProfile: DesignSmartProfile; smartProfileAiSnapshot: SmartProfileDimensionLists | undefined } {
  const staffKeys = parseStaffEditedDimensionKeys(input.priorProfile?.provenance?.staffEditedDimensionKeys);
  const aiSnapshot = buildSmartProfileAiSnapshot(input.aiProfile);
  const merged = mergeAiSmartProfileWithStaffPreserved({
    aiProfile: input.aiProfile,
    priorProfile: input.priorProfile,
    staffEditedDimensionKeys: staffKeys,
  });
  return {
    smartProfile: stripEmptySmartProfileDimensions(merged) as unknown as DesignSmartProfile,
    smartProfileAiSnapshot: aiSnapshot,
  };
}
