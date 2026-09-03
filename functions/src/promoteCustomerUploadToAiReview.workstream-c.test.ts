import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Mapping contract for promoteCustomerUploadToAiReview Workstream C fields.
 * Mirrors promoteCustomerUploadToAiReview.ts staff metadata copy rules.
 */
function mapPromoteMetadata(upload: {
  artworkBackgroundHex?: unknown;
  artworkBackgroundSource?: unknown;
  halftoneStaffDecision?: unknown;
}) {
  const halftoneDecisionSource =
    upload.halftoneStaffDecision &&
    typeof upload.halftoneStaffDecision === "object" &&
    typeof (upload.halftoneStaffDecision as { value?: unknown }).value === "boolean"
      ? ("intake" as const)
      : undefined;

  const artwork =
    typeof upload.artworkBackgroundSource === "string"
      ? {
          artworkBackgroundSource: upload.artworkBackgroundSource,
          ...(typeof upload.artworkBackgroundHex === "string"
            ? { artworkBackgroundHex: upload.artworkBackgroundHex }
            : {}),
        }
      : {};

  return { halftoneDecisionSource, ...artwork };
}

describe("promoteCustomerUploadToAiReview Workstream C mapping", () => {
  it("maps dark background + staff_manual and stamps intake provenance", () => {
    const mapped = mapPromoteMetadata({
      artworkBackgroundHex: "#2c2c2c",
      artworkBackgroundSource: "staff_manual",
      halftoneStaffDecision: {
        value: true,
        decidedBy: "staff123",
        isExplicitOverride: true,
      },
    });
    assert.equal(mapped.artworkBackgroundHex, "#2c2c2c");
    assert.equal(mapped.artworkBackgroundSource, "staff_manual");
    assert.equal(mapped.halftoneDecisionSource, "intake");
  });

  it("copies staff_manual Light (null hex) source without inventing hex", () => {
    const mapped = mapPromoteMetadata({
      artworkBackgroundSource: "staff_manual",
      artworkBackgroundHex: null,
      halftoneStaffDecision: { value: false },
    });
    assert.equal(mapped.artworkBackgroundSource, "staff_manual");
    assert.equal("artworkBackgroundHex" in mapped, false);
    assert.equal(mapped.halftoneDecisionSource, "intake");
  });

  it("omits background when Auto (no source) and omits intake stamp without staff decision", () => {
    const mapped = mapPromoteMetadata({
      artworkBackgroundHex: undefined,
      artworkBackgroundSource: undefined,
      halftoneStaffDecision: null,
    });
    assert.equal("artworkBackgroundSource" in mapped, false);
    assert.equal(mapped.halftoneDecisionSource, undefined);
  });

  it("never stamps customer as Studio intake provenance", () => {
    const mapped = mapPromoteMetadata({
      halftoneStaffDecision: { value: true },
    });
    assert.equal(mapped.halftoneDecisionSource, "intake");
    assert.notEqual(mapped.halftoneDecisionSource, "customer");
  });
});
