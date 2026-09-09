import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatPrintRequestSizeClassCountsLabel,
  resolvePrintRequestSizeClassCounts,
} from "./printRequestPocketFullSizeCounts";

describe("resolvePrintRequestSizeClassCounts (width-only)", () => {
  it("matches the four current size classes", () => {
    const counts = resolvePrintRequestSizeClassCounts(
      [
        { printWidthInches: 3.5, printHeightInches: 5.26, quantity: 5 },
        { printWidthInches: 3.5, printHeightInches: 3.5, quantity: 5 },
        { printWidthInches: 10, printHeightInches: 6.72, quantity: 2 },
        { printWidthInches: 11, printHeightInches: 5.23, quantity: 1 },
        { printWidthInches: 12, printHeightInches: 9.02, quantity: 3 },
        { printWidthInches: 14, printHeightInches: 9.02, quantity: 1 },
        { printWidthInches: 15, printHeightInches: 9.02, quantity: 4 },
      ],
    );

    assert.deepEqual(counts, {
      pocketCount: 10,
      standardFullSizeCount: 3,
      standardOversizedCount: 4,
      extraOversizedCount: 4,
    });
    assert.equal(
      formatPrintRequestSizeClassCountsLabel(counts),
      "Pocket 10 · Reg Full 3 · Reg Oversize 4 · Ext Oversize 4",
    );
  });

  it("treats widths at each fixed boundary as the lower tier", () => {
    assert.deepEqual(
      resolvePrintRequestSizeClassCounts([
        { printWidthInches: 4, printHeightInches: 12, quantity: 2 },
        { printWidthInches: 11, printHeightInches: 2, quantity: 3 },
        { printWidthInches: 14, printHeightInches: 2, quantity: 4 },
        { printWidthInches: 14.01, printHeightInches: 2, quantity: 5 },
      ]),
      {
        pocketCount: 2,
        standardFullSizeCount: 3,
        standardOversizedCount: 4,
        extraOversizedCount: 5,
      },
    );
  });

  it("ignores height for classification", () => {
    const tallNarrow = resolvePrintRequestSizeClassCounts(
      [{ printWidthInches: 3.5, printHeightInches: 22, quantity: 5 }],
    );
    const shortNarrow = resolvePrintRequestSizeClassCounts(
      [{ printWidthInches: 3.5, printHeightInches: 1, quantity: 5 }],
    );
    assert.deepEqual(tallNarrow, shortNarrow);
    assert.deepEqual(tallNarrow, {
      pocketCount: 5,
      standardFullSizeCount: 0,
      standardOversizedCount: 0,
      extraOversizedCount: 0,
    });
  });

  it("excludes canceled, zero quantity, and missing/invalid width", () => {
    assert.deepEqual(
      resolvePrintRequestSizeClassCounts(
        [
          { printWidthInches: 3, quantity: 2, status: "canceled" },
          { printWidthInches: undefined, quantity: 2 },
          { printWidthInches: 3, quantity: 0 },
          { printWidthInches: 3, quantity: 1, status: "pending" },
        ],
      ),
      {
        pocketCount: 1,
        standardFullSizeCount: 0,
        standardOversizedCount: 0,
        extraOversizedCount: 0,
      },
    );
  });

  it("hides empty label", () => {
    assert.equal(
      formatPrintRequestSizeClassCountsLabel({
        pocketCount: 0,
        standardFullSizeCount: 0,
        standardOversizedCount: 0,
        extraOversizedCount: 0,
      }),
      null,
    );
  });
});
