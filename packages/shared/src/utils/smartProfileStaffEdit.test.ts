import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CURRENT_CATALOG_ENRICH_PROMPT_VERSION, SMART_PROFILE_NORMALIZER_VERSION } from "../constants/smartProfile.constants";
import { resolveSmartProfilePipelineStatus } from "./resolveSmartProfilePipelineStatus";
import {
  mergeAiSmartProfileWithStaffPreserved,
  resetStaffEditedDimension,
} from "./smartProfileStaffEdit";

describe("resolveSmartProfilePipelineStatus", () => {
  it("returns missing when no profile", () => {
    const result = resolveSmartProfilePipelineStatus(undefined);
    assert.equal(result.status, "missing");
    assert.match(result.label, /Missing/);
  });

  it("returns current for live prompt/normalizer versions", () => {
    const result = resolveSmartProfilePipelineStatus({
      provenance: {
        version: "smart-profile-v1",
        promptVersion: CURRENT_CATALOG_ENRICH_PROMPT_VERSION,
        normalizerVersion: SMART_PROFILE_NORMALIZER_VERSION,
      },
    });
    assert.equal(result.status, "current");
    assert.match(result.label, /Current/);
  });

  it("returns older for legacy versions", () => {
    const result = resolveSmartProfilePipelineStatus({
      subjects: ["dog"],
      provenance: {
        version: "smart-profile-v1",
        promptVersion: "catalog-enrich-v27",
        normalizerVersion: "smart-profile-normalizer-v1",
      },
    });
    assert.equal(result.status, "older");
    assert.match(result.label, /Older/);
  });
});

describe("mergeAiSmartProfileWithStaffPreserved", () => {
  it("preserves staff-edited subjects during ready_backfill merge", () => {
    const prior = {
      subjects: ["staff-raccoon"],
      objects: ["old-object"],
      provenance: {
        version: "smart-profile-v1",
        staffEditedDimensionKeys: ["subjects"],
      },
    };
    const ai = {
      subjects: ["ai-raccoon"],
      objects: ["new-object"],
      provenance: {
        version: "smart-profile-v1",
        promptVersion: CURRENT_CATALOG_ENRICH_PROMPT_VERSION,
        normalizerVersion: SMART_PROFILE_NORMALIZER_VERSION,
      },
    };
    const merged = mergeAiSmartProfileWithStaffPreserved({
      aiProfile: ai,
      priorProfile: prior,
      staffEditedDimensionKeys: ["subjects"],
    });
    assert.deepEqual(merged.subjects, ["staff-raccoon"]);
    assert.deepEqual(merged.objects, ["new-object"]);
  });
});

describe("resetStaffEditedDimension", () => {
  it("restores dimension from snapshot and removes staff key", () => {
    const profile = {
      subjects: ["staff-edit"],
      provenance: {
        version: "smart-profile-v1",
        staffEditedDimensionKeys: ["subjects"],
        staffEditedBy: "owner",
        staffEditedAt: "2026-01-01T00:00:00.000Z",
      },
    };
    const next = resetStaffEditedDimension({
      profile,
      dimensionKey: "subjects",
      snapshot: { subjects: ["ai-original"] },
      staffUserId: "owner-2",
      editedAtIso: "2026-02-01T00:00:00.000Z",
    });
    assert.ok(next);
    assert.deepEqual(next!.subjects, ["ai-original"]);
    assert.equal(next!.provenance.staffEditedDimensionKeys, undefined);
  });

  it("returns null when snapshot missing", () => {
    const profile = {
      provenance: { version: "smart-profile-v1", staffEditedDimensionKeys: ["subjects"] },
    };
    assert.equal(
      resetStaffEditedDimension({
        profile,
        dimensionKey: "subjects",
        snapshot: undefined,
        staffUserId: "owner",
        editedAtIso: "2026-01-01T00:00:00.000Z",
      }),
      null,
    );
  });
});
