import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatYesNo,
  resolveExplicitAppliedFromPreview,
  resolveExplicitDetectedFromPreview,
  resolveDisplayedExplicitTerms,
  resolveWouldAutoApproveFromProvenance,
} from "./explicitAutomationPreviewDisplay";

describe("resolveWouldAutoApproveFromProvenance", () => {
  it("returns true for shadow decision", () => {
    assert.equal(
      resolveWouldAutoApproveFromProvenance({
        provenance: { version: "smart-profile-v1", automationDecision: "shadow" },
      } as never),
      true,
    );
  });

  it("returns true for shadow_would_auto_approve reason", () => {
    assert.equal(
      resolveWouldAutoApproveFromProvenance({
        provenance: {
          version: "smart-profile-v1",
          automationDecision: "needs_review",
          automationReasonCodes: ["shadow_would_auto_approve"],
        },
      } as never),
      true,
    );
  });

  it("returns false for needs_review without shadow reason", () => {
    assert.equal(
      resolveWouldAutoApproveFromProvenance({
        provenance: {
          version: "smart-profile-v1",
          automationDecision: "needs_review",
          automationReasonCodes: ["category_gap_suggested"],
        },
      } as never),
      false,
    );
  });
});

describe("resolveExplicitAppliedFromPreview", () => {
  it("prefers applied alias", () => {
    assert.equal(
      resolveExplicitAppliedFromPreview({
        provenance: {
          version: "smart-profile-v1",
          explicitAutomationPreview: {
            wouldMarkExplicitContent: false,
            applied: true,
            artworkHit: true,
          },
        },
      } as never),
      true,
    );
  });

  it("falls back to wouldMarkExplicitContent", () => {
    assert.equal(
      resolveExplicitAppliedFromPreview({
        provenance: {
          version: "smart-profile-v1",
          explicitAutomationPreview: {
            wouldMarkExplicitContent: true,
            artworkHit: true,
            proposedCensoredTerms: ["damn"],
          },
        },
      } as never),
      true,
    );
  });
});

describe("resolveExplicitDetectedFromPreview", () => {
  it("uses detected when present", () => {
    assert.equal(
      resolveExplicitDetectedFromPreview({
        provenance: {
          version: "smart-profile-v1",
          explicitAutomationPreview: {
            wouldMarkExplicitContent: false,
            detected: true,
            artworkHit: true,
            proposedCensoredTerms: ["damn"],
          },
        },
      } as never),
      true,
    );
  });

  it("infers from artworkHit + terms", () => {
    assert.equal(
      resolveExplicitDetectedFromPreview({
        provenance: {
          version: "smart-profile-v1",
          explicitAutomationPreview: {
            wouldMarkExplicitContent: false,
            artworkHit: true,
            proposedCensoredTerms: ["damn"],
          },
        },
      } as never),
      true,
    );
  });
});

describe("resolveDisplayedExplicitTerms", () => {
  it("prefers current preview terms", () => {
    assert.deepEqual(
      resolveDisplayedExplicitTerms(
        {
          provenance: {
            version: "smart-profile-v1",
            explicitAutomationPreview: {
              artworkHit: true,
              proposedCensoredTerms: ["damn"],
            },
          },
        } as never,
        ["old-term"],
        true,
      ),
      ["damn"],
    );
  });

  it("falls back to persisted terms for older Explicit records", () => {
    assert.deepEqual(
      resolveDisplayedExplicitTerms(
        { provenance: { version: "smart-profile-v1" } } as never,
        ["fuck", " eat my ass "],
        true,
      ),
      ["fuck", " eat my ass "],
    );
  });

  it("does not resurrect persisted terms when the current preview has no match", () => {
    assert.deepEqual(
      resolveDisplayedExplicitTerms(
        {
          provenance: {
            version: "smart-profile-v1",
            explicitAutomationPreview: {
              artworkHit: false,
              proposedCensoredTerms: [],
            },
          },
        } as never,
        ["1559", "1565"],
        true,
      ),
      [],
    );
  });
});

describe("formatYesNo", () => {
  it("formats booleans", () => {
    assert.equal(formatYesNo(true), "YES");
    assert.equal(formatYesNo(false), "NO");
  });
});
