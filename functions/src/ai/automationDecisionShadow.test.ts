import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SMART_PROFILE_VERSION } from "../../../packages/shared/src/types/catalog/smartProfile.types";

import { computeShadowAutomationDecision } from "./automationDecisionShadow";

describe("computeShadowAutomationDecision", () => {
  it("routes unresolved category to needs_review in shadow scoring", () => {
    const result = computeShadowAutomationDecision({
      smartProfile: {
        provenance: {
          version: SMART_PROFILE_VERSION,
          generatedAt: new Date().toISOString(),
        },
      },
      title: "Short Title",
      description: "A raccoon with coffee.",
    });

    assert.equal(result.decision, "needs_review");
    assert.ok(result.reasonCodes.includes("category_unresolved"));
  });

  it("keeps strong metadata in shadow_would_auto_approve bucket", () => {
    const result = computeShadowAutomationDecision({
      smartProfile: {
        subjects: ["raccoon"],
        provenance: {
          version: SMART_PROFILE_VERSION,
          generatedAt: new Date().toISOString(),
        },
      },
      title: "Trash Panda Coffee",
      categoryId: "animals",
      description: "A raccoon holding coffee.",
    });

    assert.equal(result.decision, "shadow");
    assert.ok(result.reasonCodes.includes("shadow_would_auto_approve"));
  });
});
