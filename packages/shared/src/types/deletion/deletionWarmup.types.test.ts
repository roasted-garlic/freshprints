import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isDeletionCallableWarmupRequest,
  type DeletionCallableWarmupRequest,
} from "./deletionWarmup.types";

describe("isDeletionCallableWarmupRequest", () => {
  it("accepts warmup: true only", () => {
    const request: DeletionCallableWarmupRequest = { warmup: true };
    assert.equal(isDeletionCallableWarmupRequest(request), true);
  });

  it("rejects missing, false, or string warmup flags", () => {
    assert.equal(isDeletionCallableWarmupRequest(undefined), false);
    assert.equal(isDeletionCallableWarmupRequest(null), false);
    assert.equal(isDeletionCallableWarmupRequest({}), false);
    assert.equal(isDeletionCallableWarmupRequest({ warmup: false }), false);
    assert.equal(isDeletionCallableWarmupRequest({ warmup: "true" }), false);
    assert.equal(isDeletionCallableWarmupRequest({ printRequestId: "x" }), false);
  });

  it("still recognizes warmup when other fields are present (fail-closed path uses flag first)", () => {
    assert.equal(isDeletionCallableWarmupRequest({ warmup: true, printRequestId: "x" }), true);
  });
});
