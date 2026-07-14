import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveAiReviewHalftoneStaffToggle,
  resolveIntakeHalftoneStaffToggle,
  syncHalftoneTagInList,
} from "./halftoneReviewState";

describe("resolveIntakeHalftoneStaffToggle", () => {
  it("prefers explicit staff false over customer yes", () => {
    assert.equal(
      resolveIntakeHalftoneStaffToggle({
        staffDecision: { value: false },
        submitterResponse: { value: "yes" },
      }),
      false,
    );
  });

  it("customer yes initializes on", () => {
    assert.equal(
      resolveIntakeHalftoneStaffToggle({
        submitterResponse: { value: "yes" },
      }),
      true,
    );
  });

  it("customer no / unanswered initialize off", () => {
    assert.equal(
      resolveIntakeHalftoneStaffToggle({ submitterResponse: { value: "no" } }),
      false,
    );
    assert.equal(resolveIntakeHalftoneStaffToggle({}), false);
  });
});

describe("resolveAiReviewHalftoneStaffToggle", () => {
  it("prefers explicit staff false", () => {
    assert.equal(
      resolveAiReviewHalftoneStaffToggle({
        staffDecision: { value: false },
        submitterResponse: { value: "yes" },
      }),
      false,
    );
  });

  it("uses intake staff decision when AI Review decision missing", () => {
    assert.equal(
      resolveAiReviewHalftoneStaffToggle({
        intakeStaffDecision: { value: false },
        submitterResponse: { value: "yes" },
      }),
      false,
    );
  });

  it("customer yes only when no staff decision exists", () => {
    assert.equal(
      resolveAiReviewHalftoneStaffToggle({
        submitterResponse: { value: "yes" },
      }),
      true,
    );
  });

  it("defaults off", () => {
    assert.equal(resolveAiReviewHalftoneStaffToggle({}), false);
  });
});

describe("syncHalftoneTagInList", () => {
  it("adds canonical halftone without duplicates", () => {
    assert.deepEqual(syncHalftoneTagInList(["cute", "halftone"], true), ["cute", "halftone"]);
    assert.deepEqual(syncHalftoneTagInList(["cute"], true), ["cute", "halftone"]);
  });

  it("removes halftone when unchecked", () => {
    assert.deepEqual(syncHalftoneTagInList(["cute", "halftone"], false), ["cute"]);
  });
});
