import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  evaluateMergeContinuablePolicy,
  type ContinuablePrintRequestWithItemCount,
} from "./customerMergeContinuablePrintRequests";

function request(
  id: string,
  itemCount: number,
): ContinuablePrintRequestWithItemCount {
  return { id, name: `Request ${id}`, status: "draft", itemCount };
}

describe("evaluateMergeContinuablePolicy", () => {
  it("allows when neither customer has continuable requests", () => {
    const result = evaluateMergeContinuablePolicy({ source: [], survivor: [] });
    assert.equal(result.blocked, false);
    assert.equal(result.sourceClassification, "none");
    assert.equal(result.survivorClassification, "none");
  });

  it("allows when only survivor has a meaningful continuable request", () => {
    const result = evaluateMergeContinuablePolicy({
      source: [],
      survivor: [request("survivor-pr", 2)],
    });
    assert.equal(result.blocked, false);
    assert.equal(result.survivorClassification, "meaningful");
  });

  it("allows when only survivor has an empty continuable request", () => {
    const result = evaluateMergeContinuablePolicy({
      source: [],
      survivor: [request("survivor-empty", 0)],
    });
    assert.equal(result.blocked, false);
    assert.deepEqual(result.emptyPrintRequestIdsToRemove, ["survivor-empty"]);
  });

  it("allows when only source has an empty continuable request", () => {
    const result = evaluateMergeContinuablePolicy({
      source: [request("source-empty", 0)],
      survivor: [],
    });
    assert.equal(result.blocked, false);
    assert.deepEqual(result.emptyPrintRequestIdsToRemove, ["source-empty"]);
  });

  it("allows when both have only empty continuable requests", () => {
    const result = evaluateMergeContinuablePolicy({
      source: [request("source-empty", 0)],
      survivor: [request("survivor-empty", 0)],
    });
    assert.equal(result.blocked, false);
    assert.deepEqual(result.emptyPrintRequestIdsToRemove.sort(), [
      "source-empty",
      "survivor-empty",
    ]);
  });

  it("allows when source has meaningful and survivor has none (reassign)", () => {
    const result = evaluateMergeContinuablePolicy({
      source: [request("source-meaningful", 3)],
      survivor: [],
    });
    assert.equal(result.blocked, false);
    assert.deepEqual(result.sourceMeaningfulPrintRequestIdsToReassign, ["source-meaningful"]);
  });

  it("allows when source has empty and survivor has meaningful", () => {
    const result = evaluateMergeContinuablePolicy({
      source: [request("source-empty", 0)],
      survivor: [request("survivor-meaningful", 1)],
    });
    assert.equal(result.blocked, false);
    assert.deepEqual(result.emptyPrintRequestIdsToRemove, ["source-empty"]);
  });

  it("blocks when both have meaningful continuable requests", () => {
    const result = evaluateMergeContinuablePolicy({
      source: [request("source-meaningful", 1)],
      survivor: [request("survivor-meaningful", 2)],
    });
    assert.equal(result.blocked, true);
    assert.ok(
      result.blockers.some((blocker) => blocker.code === "dual_meaningful_continuable_print_requests"),
    );
  });

  it("allows when source has meaningful and survivor has empty continuable", () => {
    const result = evaluateMergeContinuablePolicy({
      source: [request("source-meaningful", 4)],
      survivor: [request("survivor-empty", 0)],
    });
    assert.equal(result.blocked, false);
    assert.deepEqual(result.emptyPrintRequestIdsToRemove, ["survivor-empty"]);
    assert.deepEqual(result.sourceMeaningfulPrintRequestIdsToReassign, ["source-meaningful"]);
  });

  it("detects when stale preview empty became meaningful at apply recheck", () => {
    const previewPolicy = evaluateMergeContinuablePolicy({
      source: [request("source-empty", 0)],
      survivor: [],
    });
    assert.equal(previewPolicy.sourceContinuableRequests[0]?.classification, "empty");

    const staleAtApply = evaluateMergeContinuablePolicy({
      source: [request("source-empty", 2)],
      survivor: [],
    });
    assert.equal(staleAtApply.sourceClassification, "meaningful");
    assert.deepEqual(staleAtApply.sourceMeaningfulPrintRequestIdsToReassign, ["source-empty"]);
    assert.equal(staleAtApply.emptyPrintRequestIdsToRemove.length, 0);
  });
});

describe("buildMergeSourcePlaceholderUsername", () => {
  it("uses merged-src prefix", async () => {
    const { buildMergeSourcePlaceholderUsername } = await import("./customerMergeUsername");
    const placeholder = buildMergeSourcePlaceholderUsername("cust-abcd1234-5678-90ef");
    assert.match(placeholder, /^merged-src-[a-z0-9-]+$/);
  });
});

describe("CUSTOMER_ACCOUNT_MERGE_STAGES", () => {
  it("validates preview before acquiring identity locks", async () => {
    const { CUSTOMER_ACCOUNT_MERGE_STAGES } = await import(
      "../../../packages/shared/src/constants/customerAccountMerge.constants"
    );
    assert.equal(CUSTOMER_ACCOUNT_MERGE_STAGES[0], "validate_preview");
    assert.equal(CUSTOMER_ACCOUNT_MERGE_STAGES[1], "acquire_locks");
  });
});
