import { describe, it } from "node:test";
import { deepStrictEqual } from "node:assert";
import {
  mergeSmartProfileImportPresets,
  extractImportPresetKeysForSeedRetention,
  createImportPresetSeed,
  syncImportPresetSeedOnStaffEdit,
} from "./smartProfileImportPresets";
import type { SmartProfileDimensionLists, SmartProfileProvenance } from "../types/catalog/smartProfile.types";

const expect = (actual: unknown) => ({
  toEqual: (expected: unknown) => deepStrictEqual(actual, expected),
  toBeUndefined: () => deepStrictEqual(actual, undefined),
  not: {
    toBe: (expected: unknown) => {
      if (actual === expected) {
        throw new Error(`Expected ${actual} not to be ${expected}`);
      }
    },
  },
});

describe("mergeSmartProfileImportPresets", () => {
  const mockProvenance: SmartProfileProvenance = {
    version: "smart-profile-v1",
    provider: "test",
    generatedAt: "2024-01-01T00:00:00Z",
  };

  const mockAiProfile: SmartProfileDimensionLists & { provenance: SmartProfileProvenance } = {
    subjects: ["ai-subject1", "ai-subject2"],
    places: ["ai-place1"],
    colors: ["ai-color1", "ai-color2"],
    provenance: mockProvenance,
  };

  it("returns AI profile unchanged when no import presets provided", () => {
    const result = mergeSmartProfileImportPresets(mockAiProfile);
    expect(result).toEqual(mockAiProfile);
  });

  it("returns AI profile unchanged when empty import presets provided", () => {
    const result = mergeSmartProfileImportPresets(mockAiProfile, {});
    expect(result).toEqual(mockAiProfile);
  });

  it("merges import presets with AI values, presets take precedence", () => {
    const importPresets = {
      subjects: ["preset-subject1", "preset-subject2"],
      themes: ["preset-theme1"],
    };

    const result = mergeSmartProfileImportPresets(mockAiProfile, importPresets);

    expect(result.subjects).toEqual(["preset-subject1", "preset-subject2", "ai-subject1", "ai-subject2"]);
    expect(result.themes).toEqual(["preset-theme1"]);
    expect(result.places).toEqual(["ai-place1"]); // AI-only dimension unchanged
    expect(result.colors).toEqual(["ai-color1", "ai-color2"]); // AI-only dimension unchanged
    expect(result.provenance.importPresetDimensionKeys).toEqual(["subjects", "themes"]);
  });

  it("deduplicates values when AI and presets overlap", () => {
    const importPresets = {
      subjects: ["preset-subject", "ai-subject1"], // ai-subject1 already in AI
      places: ["preset-place", "ai-place1"], // ai-place1 already in AI
    };

    const result = mergeSmartProfileImportPresets(mockAiProfile, importPresets);

    expect(result.subjects).toEqual(["preset-subject", "ai-subject1", "ai-subject2"]);
    expect(result.places).toEqual(["preset-place", "ai-place1"]);
    expect(result.provenance.importPresetDimensionKeys).toEqual(["subjects", "places"]);
  });

  it("ignores empty preset arrays", () => {
    const importPresets = {
      subjects: ["preset-subject1"],
      themes: [], // Empty array should be ignored
    };

    const result = mergeSmartProfileImportPresets(mockAiProfile, importPresets);

    expect(result.subjects).toEqual(["preset-subject1", "ai-subject1", "ai-subject2"]);
    expect(result.themes).toBeUndefined();
    expect(result.provenance.importPresetDimensionKeys).toEqual(["subjects"]);
  });

  it("filters to only editable dimension keys", () => {
    const importPresetsWithInvalid = {
      subjects: ["preset-subject1"],
      invalidKey: ["invalid-value"],
    } as Partial<SmartProfileDimensionLists> & { invalidKey: string[] };

    const result = mergeSmartProfileImportPresets(mockAiProfile, importPresetsWithInvalid);

    expect(result.subjects).toEqual(["preset-subject1", "ai-subject1", "ai-subject2"]);
    expect((result as unknown as Record<string, unknown>).invalidKey).toBeUndefined();
    expect(result.provenance.importPresetDimensionKeys).toEqual(["subjects"]);
  });
});

describe("extractImportPresetKeysForSeedRetention", () => {
  it("returns undefined when no smart profile provided", () => {
    const result = extractImportPresetKeysForSeedRetention(undefined);
    expect(result).toBeUndefined();
  });

  it("returns undefined when no import preset keys in provenance", () => {
    const smartProfile = {
      subjects: ["test"],
      provenance: { version: "smart-profile-v1" },
    };
    const result = extractImportPresetKeysForSeedRetention(smartProfile);
    expect(result).toBeUndefined();
  });

  it("returns undefined when import preset keys array is empty", () => {
    const smartProfile = {
      subjects: ["test"],
      provenance: { version: "smart-profile-v1", importPresetDimensionKeys: [] },
    };
    const result = extractImportPresetKeysForSeedRetention(smartProfile);
    expect(result).toBeUndefined();
  });

  it("returns copy of import preset keys when present", () => {
    const smartProfile = {
      subjects: ["test"],
      themes: ["test2"],
      provenance: { version: "smart-profile-v1", importPresetDimensionKeys: ["subjects", "themes"] },
    };
    const result = extractImportPresetKeysForSeedRetention(smartProfile);
    expect(result).toEqual(["subjects", "themes"]);
    expect(result).not.toBe(smartProfile.provenance.importPresetDimensionKeys); // Should be a copy
  });
});

describe("createImportPresetSeed", () => {
  it("returns undefined when no smart profile provided", () => {
    const result = createImportPresetSeed(undefined);
    expect(result).toBeUndefined();
  });

  it("returns undefined when no import preset keys", () => {
    const smartProfile = {
      subjects: ["test"],
      provenance: { version: "smart-profile-v1" },
    };
    const result = createImportPresetSeed(smartProfile);
    expect(result).toBeUndefined();
  });

  it("creates seed with only import preset dimensions", () => {
    const smartProfile = {
      subjects: ["preset-subject1", "ai-subject1"],
      themes: ["preset-theme1"],
      places: ["ai-place1"], // This should not be in seed as it's not a preset key
      provenance: { 
        version: "smart-profile-v1", 
        importPresetDimensionKeys: ["subjects", "themes"] 
      },
    };
    
    const result = createImportPresetSeed(smartProfile);
    expect(result).toEqual({
      subjects: ["preset-subject1", "ai-subject1"],
      themes: ["preset-theme1"],
    });
    expect(result?.places).toBeUndefined();
  });

  it("returns undefined when preset dimensions have no values", () => {
    const smartProfile = {
      subjects: [], // Empty array
      provenance: { 
        version: "smart-profile-v1", 
        importPresetDimensionKeys: ["subjects"] 
      },
    };
    
    const result = createImportPresetSeed(smartProfile);
    expect(result).toBeUndefined();
  });

  it("creates seed copying arrays to avoid mutations", () => {
    const originalSubjects = ["preset-subject1"];
    const smartProfile = {
      subjects: originalSubjects,
      provenance: { 
        version: "smart-profile-v1", 
        importPresetDimensionKeys: ["subjects"] 
      },
    };
    
    const result = createImportPresetSeed(smartProfile);
    expect(result?.subjects).toEqual(originalSubjects);
    expect(result?.subjects).not.toBe(originalSubjects); // Should be a copy
  });
});
describe("syncImportPresetSeedOnStaffEdit", () => {
  it("clears a preset dimension from the seed when staff removes values", () => {
    const result = syncImportPresetSeedOnStaffEdit({
      seed: { subjects: ["Dolly Parton"], places: ["Pensacola, FL"] },
      importPresetDimensionKeys: ["subjects", "places"],
      patch: { subjects: [] },
    });
    expect(result).toEqual({ places: ["Pensacola, FL"] });
  });

  it("updates seed values when staff edits a tracked dimension", () => {
    const result = syncImportPresetSeedOnStaffEdit({
      seed: { subjects: ["Dolly Parton"] },
      importPresetDimensionKeys: ["subjects"],
      patch: { subjects: ["Johnny Cash"] },
    });
    expect(result).toEqual({ subjects: ["Johnny Cash"] });
  });

  it("returns null when staff clears the last seeded dimension", () => {
    const result = syncImportPresetSeedOnStaffEdit({
      seed: { subjects: ["Dolly Parton"] },
      importPresetDimensionKeys: ["subjects"],
      patch: { subjects: undefined },
    });
    expect(result).toEqual(null);
  });

  it("does not mutate untracked dimensions from an unrelated staff patch", () => {
    const result = syncImportPresetSeedOnStaffEdit({
      seed: { subjects: ["Dolly Parton"] },
      importPresetDimensionKeys: ["subjects"],
      patch: { themes: ["Country"] },
    });
    expect(result).toEqual({ subjects: ["Dolly Parton"] });
  });
});
