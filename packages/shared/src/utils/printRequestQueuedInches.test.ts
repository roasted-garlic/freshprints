import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveQueuedPrintInches } from "./printRequestQueuedInches";

describe("resolveQueuedPrintInches", () => {
  it("prefers allocation inches over item inches", () => {
    assert.deepEqual(
      resolveQueuedPrintInches({
        allocationWidthInches: 14,
        allocationHeightInches: 21.1,
        itemWidthInches: 10,
        itemHeightInches: 10,
      }),
      { printWidthInches: 14, printHeightInches: 21.1 },
    );
  });

  it("falls back to item inches when the allocation snapshot is missing", () => {
    assert.deepEqual(
      resolveQueuedPrintInches({
        itemWidthInches: 14,
        itemHeightInches: 21.1,
      }),
      { printWidthInches: 14, printHeightInches: 21.1 },
    );
  });

  it("does not substitute native/default inches when both snapshots are missing", () => {
    assert.throws(
      () => resolveQueuedPrintInches({}),
      /missing requested print size/,
    );
  });
});
