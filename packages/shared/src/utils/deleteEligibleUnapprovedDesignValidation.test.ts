import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DELETE_ELIGIBLE_UNAPPROVED_DESIGN_CONFIRMATION_PHRASE } from "../types/admin/deleteEligibleUnapprovedDesign.types";
import {
  isActiveAiPipelineStage,
  isDeleteEligibleUnapprovedDesignStatus,
  validateDeleteEligibleUnapprovedDesignRequest,
} from "./deleteEligibleUnapprovedDesignValidation";

describe("validateDeleteEligibleUnapprovedDesignRequest", () => {
  it("requires confirmation phrase for every delete", () => {
    const result = validateDeleteEligibleUnapprovedDesignRequest({
      designIds: ["abc123"],
    });
    assert.equal(result.ok, false);
    assert.equal(result.error, "confirmation_required");
  });

  it("allows a single design with exact confirmation phrase", () => {
    const result = validateDeleteEligibleUnapprovedDesignRequest({
      designIds: ["abc123"],
      confirmationPhrase: DELETE_ELIGIBLE_UNAPPROVED_DESIGN_CONFIRMATION_PHRASE,
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.designIds, ["abc123"]);
  });

  it("rejects wrong confirmation phrase", () => {
    const result = validateDeleteEligibleUnapprovedDesignRequest({
      designIds: ["abc123"],
      confirmationPhrase: "DELETE",
    });
    assert.equal(result.ok, false);
    assert.equal(result.error, "confirmation_mismatch");
  });

  it("rejects more than 25 ids", () => {
    const result = validateDeleteEligibleUnapprovedDesignRequest({
      designIds: Array.from({ length: 26 }, (_, index) => `id${index}`),
      confirmationPhrase: DELETE_ELIGIBLE_UNAPPROVED_DESIGN_CONFIRMATION_PHRASE,
    });
    assert.equal(result.ok, false);
    assert.equal(result.error, "design_ids_too_many");
  });
});

describe("delete eligible status / AI stage guards", () => {
  it("allows only imported and processing", () => {
    assert.equal(isDeleteEligibleUnapprovedDesignStatus("imported"), true);
    assert.equal(isDeleteEligibleUnapprovedDesignStatus("processing"), true);
    assert.equal(isDeleteEligibleUnapprovedDesignStatus("ready"), false);
    assert.equal(isDeleteEligibleUnapprovedDesignStatus("rejected"), false);
    assert.equal(isDeleteEligibleUnapprovedDesignStatus("archived"), false);
    assert.equal(isDeleteEligibleUnapprovedDesignStatus("queued"), false);
    assert.equal(isDeleteEligibleUnapprovedDesignStatus("future_status"), false);
  });

  it("detects active AI pipeline stages", () => {
    assert.equal(isActiveAiPipelineStage("queued"), true);
    assert.equal(isActiveAiPipelineStage("sending_to_ai"), true);
    assert.equal(isActiveAiPipelineStage("failed"), false);
    assert.equal(isActiveAiPipelineStage(null), false);
  });
});
