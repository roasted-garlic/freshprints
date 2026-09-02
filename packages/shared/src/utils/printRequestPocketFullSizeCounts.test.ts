import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatPocketFullSizeCountsLabel,
  resolvePrintRequestPocketFullSizeCounts,
} from "./printRequestPocketFullSizeCounts";

describe("resolvePrintRequestPocketFullSizeCounts (width-only)", () => {
  it("matches the Owner QA fixture: Pocket 10 · Full Size 3 at cutoff 4", () => {
    const counts = resolvePrintRequestPocketFullSizeCounts(
      [
        { printWidthInches: 3.5, printHeightInches: 5.26, quantity: 5 },
        { printWidthInches: 3.5, printHeightInches: 3.5, quantity: 5 },
        { printWidthInches: 10, printHeightInches: 6.72, quantity: 1 },
        { printWidthInches: 10, printHeightInches: 5.23, quantity: 1 },
        { printWidthInches: 10, printHeightInches: 9.02, quantity: 1 },
      ],
      4,
    );

    assert.deepEqual(counts, { pocketCount: 10, fullSizeCount: 3 });
    assert.equal(formatPocketFullSizeCountsLabel(counts), "Pocket 10 · Full Size 3");
  });

  it("treats width exactly at cutoff as Pocket", () => {
    assert.deepEqual(
      resolvePrintRequestPocketFullSizeCounts(
        [{ printWidthInches: 4, printHeightInches: 12, quantity: 2 }],
        4,
      ),
      { pocketCount: 2, fullSizeCount: 0 },
    );
  });

  it("treats width just above cutoff as Full Size", () => {
    assert.deepEqual(
      resolvePrintRequestPocketFullSizeCounts(
        [{ printWidthInches: 4.01, printHeightInches: 2, quantity: 3 }],
        4,
      ),
      { pocketCount: 0, fullSizeCount: 3 },
    );
  });

  it("ignores height for classification", () => {
    const tallNarrow = resolvePrintRequestPocketFullSizeCounts(
      [{ printWidthInches: 3.5, printHeightInches: 22, quantity: 5 }],
      4,
    );
    const shortNarrow = resolvePrintRequestPocketFullSizeCounts(
      [{ printWidthInches: 3.5, printHeightInches: 1, quantity: 5 }],
      4,
    );
    assert.deepEqual(tallNarrow, shortNarrow);
    assert.deepEqual(tallNarrow, { pocketCount: 5, fullSizeCount: 0 });
  });

  it("recalculates when the configured cutoff changes", () => {
    const rows = [{ printWidthInches: 4.5, printHeightInches: 10, quantity: 2 }];
    assert.deepEqual(resolvePrintRequestPocketFullSizeCounts(rows, 4), {
      pocketCount: 0,
      fullSizeCount: 2,
    });
    assert.deepEqual(resolvePrintRequestPocketFullSizeCounts(rows, 5), {
      pocketCount: 2,
      fullSizeCount: 0,
    });
  });

  it("excludes canceled, zero quantity, and missing/invalid width", () => {
    assert.deepEqual(
      resolvePrintRequestPocketFullSizeCounts(
        [
          { printWidthInches: 3, quantity: 2, status: "canceled" },
          { printWidthInches: undefined, quantity: 2 },
          { printWidthInches: 3, quantity: 0 },
          { printWidthInches: 3, quantity: 1, status: "pending" },
        ],
        4,
      ),
      { pocketCount: 1, fullSizeCount: 0 },
    );
  });

  it("hides empty label", () => {
    assert.equal(formatPocketFullSizeCountsLabel({ pocketCount: 0, fullSizeCount: 0 }), null);
  });
});
