import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveShowFinishMutationPlan } from "./showFinishMutationPlan";

describe("resolveShowFinishMutationPlan", () => {
  it("mutates Printing, no-ops completed/fully_printed, and rejects other states", () => {
    assert.equal(resolveShowFinishMutationPlan("printing"), "mutate");
    assert.equal(resolveShowFinishMutationPlan("completed"), "already_terminal");
    assert.equal(resolveShowFinishMutationPlan("fully_printed"), "already_terminal");
    assert.equal(resolveShowFinishMutationPlan("open"), "reject");
    assert.equal(resolveShowFinishMutationPlan("full"), "reject");
    assert.equal(resolveShowFinishMutationPlan("canceled"), "reject");
    assert.equal(resolveShowFinishMutationPlan("archived"), "reject");
  });
});
