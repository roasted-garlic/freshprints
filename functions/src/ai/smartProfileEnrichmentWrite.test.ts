import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSmartProfileAiSnapshot,
  mergeReadyBackfillSmartProfile,
} from "./smartProfileEnrichmentWrite";

describe("buildSmartProfileAiSnapshot", () => {
  it("captures dimension lists from AI profile", () => {
    const snapshot = buildSmartProfileAiSnapshot({
      subjects: ["dog"],
      styles: ["retro"],
      provenance: { version: "smart-profile-v1" },
    });
    assert.deepEqual(snapshot, { subjects: ["dog"], styles: ["retro"] });
  });
});

describe("mergeReadyBackfillSmartProfile", () => {
  it("preserves staff-edited dimensions", () => {
    const merged = mergeReadyBackfillSmartProfile({
      aiProfile: {
        subjects: ["cat"],
        styles: ["modern"],
        provenance: { version: "smart-profile-v1", promptVersion: "catalog-enrich-v30" },
      },
      priorProfile: {
        subjects: ["dog"],
        styles: ["retro"],
        provenance: {
          version: "smart-profile-v1",
          staffEditedDimensionKeys: ["subjects"],
          staffEditedBy: "owner-1",
          staffEditedAt: "2026-08-26T00:00:00.000Z",
        },
      },
    });

    assert.deepEqual(merged.smartProfile.subjects, ["dog"]);
    assert.deepEqual(merged.smartProfile.styles, ["modern"]);
    assert.deepEqual(merged.smartProfileAiSnapshot, { subjects: ["cat"], styles: ["modern"] });
    assert.deepEqual(merged.smartProfile.provenance.staffEditedDimensionKeys, ["subjects"]);
  });

  it("replaces non-staff-edited dimensions from AI", () => {
    const merged = mergeReadyBackfillSmartProfile({
      aiProfile: {
        subjects: ["cat"],
        provenance: { version: "smart-profile-v1" },
      },
      priorProfile: {
        subjects: ["dog"],
        provenance: { version: "smart-profile-v1" },
      },
    });
    assert.deepEqual(merged.smartProfile.subjects, ["cat"]);
  });

  it("restores import presets omitted by AI before staff merge", () => {
    const merged = mergeReadyBackfillSmartProfile({
      aiProfile: {
        styles: ["modern"],
        provenance: { version: "smart-profile-v1" },
      },
      priorProfile: {
        subjects: ["Dolly Parton"],
        styles: ["retro"],
        provenance: {
          version: "smart-profile-v1",
          staffEditedDimensionKeys: ["styles"],
          staffEditedBy: "owner-1",
          staffEditedAt: "2026-08-26T00:00:00.000Z",
        },
      },
      importPresets: { subjects: ["Dolly Parton"], places: ["Pensacola, FL"] },
    });
    assert.deepEqual(merged.smartProfile.subjects, ["Dolly Parton"]);
    assert.deepEqual(merged.smartProfile.places, ["Pensacola, FL"]);
    assert.deepEqual(merged.smartProfile.styles, ["retro"]);
    assert.deepEqual(merged.smartProfile.provenance.importPresetDimensionKeys, [
      "subjects",
      "places",
    ]);
  });
});
