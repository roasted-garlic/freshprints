import assert from "node:assert/strict";
import { test } from "node:test";

import { formatPrintRequestAllocationSummary } from "./printRequestSummaryCopy";

test("formatPrintRequestAllocationSummary: pluralizes both designs and prints", () => {
  assert.equal(
    formatPrintRequestAllocationSummary(4, 8),
    "Request has 4 designs with a total qty of 8 prints.",
  );
});

test("formatPrintRequestAllocationSummary: uses singular design and print", () => {
  assert.equal(
    formatPrintRequestAllocationSummary(1, 1),
    "Request has 1 design with a total qty of 1 print.",
  );
});

test("formatPrintRequestAllocationSummary: singular design, plural prints", () => {
  assert.equal(
    formatPrintRequestAllocationSummary(1, 5),
    "Request has 1 design with a total qty of 5 prints.",
  );
});
