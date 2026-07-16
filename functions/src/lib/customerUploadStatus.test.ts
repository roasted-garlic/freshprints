import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canTransitionTechnicalStatus,
  assertTechnicalStatusTransition,
} from "./customerUploadStatus";

describe("customerUploadStatus", () => {
  it("allows awaiting_upload → validating", () => {
    assert.equal(canTransitionTechnicalStatus("awaiting_upload", "validating"), true);
  });

  it("allows failed → validating retry", () => {
    assert.equal(canTransitionTechnicalStatus("failed", "validating"), true);
  });

  it("rejects ready → validating", () => {
    assert.equal(canTransitionTechnicalStatus("ready", "validating"), false);
  });

  it("treats same status as allowed", () => {
    assert.equal(canTransitionTechnicalStatus("ready", "ready"), true);
  });

  it("throws on invalid assert", () => {
    assert.throws(() => assertTechnicalStatusTransition("ready", "failed"));
  });
});
