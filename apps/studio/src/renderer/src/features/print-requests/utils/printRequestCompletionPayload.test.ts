import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildPrintRequestCompletionPayload } from "./printRequestCompletionPayload";

describe("print request completion payload", () => {
  it("contains exactly status, authenticated updatedBy, and server timestamp", () => {
    const timestampSentinel = { kind: "server-timestamp" };
    const payload = buildPrintRequestCompletionPayload(
      "staff-uid",
      () => timestampSentinel as never,
    );

    assert.deepEqual(Object.keys(payload).sort(), ["status", "updatedAt", "updatedBy"]);
    assert.equal(payload.status, "completed");
    assert.equal(payload.updatedBy, "staff-uid");
    assert.equal(payload.updatedAt, timestampSentinel);
    assert.equal(Object.values(payload).some((value) => value === undefined), false);
  });
});
