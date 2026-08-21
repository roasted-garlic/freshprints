import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertQueuePrintRequestItemSize } from "./assertQueuePrintRequestItemSize";

describe("assertQueuePrintRequestItemSize", () => {
  it("accepts Painkiller 14 × 21.1 at production pixels", () => {
    const result = assertQueuePrintRequestItemSize({
      printWidthInches: 14,
      printHeightInches: 21.1,
      pixelWidth: 4312,
      pixelHeight: 6499,
    });
    assert.deepEqual(result, { printWidthInches: 14, printHeightInches: 21.1 });
  });

  it("rejects missing inches", () => {
    assert.throws(
      () =>
        assertQueuePrintRequestItemSize({
          pixelWidth: 3000,
          pixelHeight: 3000,
        }),
      /missing a requested print size/,
    );
  });

  it("rejects below 200 DPI", () => {
    assert.throws(
      () =>
        assertQueuePrintRequestItemSize({
          printWidthInches: 20,
          printHeightInches: 20,
          pixelWidth: 1000,
          pixelHeight: 1000,
        }),
      /200 DPI/,
    );
  });

  it("rejects over 22 inches", () => {
    assert.throws(
      () =>
        assertQueuePrintRequestItemSize({
          printWidthInches: 22.1,
          printHeightInches: 22.1,
          pixelWidth: 9000,
          pixelHeight: 9000,
        }),
      /22 inches/,
    );
  });
});
