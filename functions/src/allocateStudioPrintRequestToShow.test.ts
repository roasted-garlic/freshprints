import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseAllocateStudioPrintRequestToShowRequest,
  validateStudioAllocationLegTotals,
  type AllocateStudioPrintRequestToShowLeg,
} from "./allocateStudioPrintRequestToShow";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

describe("allocateStudioPrintRequestToShow contract", () => {
  it("keeps the stuck editing-row repair path non-destructive", () => {
    const source = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "allocateStudioPrintRequestToShow.ts"),
      "utf8",
    );
    assert.match(source, /repairedExistingAllocationState/);
    assert.match(source, /parksDraftPrintRequestId: FieldValue\.delete\(\)/);
    assert.match(source, /status: "active"/);
  });

  it("accepts an atomic multi-show plan with positive item quantities", () => {
    const parsed = parseAllocateStudioPrintRequestToShowRequest({
      printRequestId: "request-1",
      legs: [
        { upcomingShowId: "show-1", quantitiesByItemId: { "item-1": 2 } },
        { upcomingShowId: "show-2", quantitiesByItemId: { "item-1": 1, "item-2": 3 } },
      ],
    });

    assert.equal(parsed.printRequestId, "request-1");
    assert.deepEqual(parsed.legs[1]?.quantitiesByItemId, { "item-1": 1, "item-2": 3 });
  });

  it("rejects zero, fractional, empty, and partial plans before any Admin write", () => {
    assert.throws(
      () => parseAllocateStudioPrintRequestToShowRequest({
        printRequestId: "request-1",
        legs: [{ upcomingShowId: "show-1", quantitiesByItemId: { "item-1": 0 } }],
      }),
      /positive whole numbers/,
    );
    assert.throws(
      () => parseAllocateStudioPrintRequestToShowRequest({ printRequestId: "request-1", legs: [] }),
      /at least one show allocation/,
    );

    const legs: AllocateStudioPrintRequestToShowLeg[] = [
      { upcomingShowId: "show-1", quantitiesByItemId: { "item-1": 1 } },
    ];
    assert.throws(
      () =>
        validateStudioAllocationLegTotals(
          legs,
          new Map([["item-1", { id: "item-1", quantity: 3, sourceType: "catalog_design", designId: "design-1" }]]),
          new Map([["item-1", 3]]),
        ),
      /all remaining prints/,
    );
  });

  it("aggregates split legs and requires every remaining item quantity", () => {
    const totals = validateStudioAllocationLegTotals(
      [
        { upcomingShowId: "show-1", quantitiesByItemId: { "item-1": 2 } },
        { upcomingShowId: "show-2", quantitiesByItemId: { "item-1": 1, "item-2": 2 } },
      ],
      new Map([
        ["item-1", { id: "item-1", quantity: 3, sourceType: "catalog_design", designId: "design-1" }],
        ["item-2", { id: "item-2", quantity: 2, sourceType: "customer_upload", customerUploadId: "upload-1" }],
      ]),
      new Map([
        ["item-1", 3],
        ["item-2", 2],
      ]),
    );

    assert.deepEqual([...totals.entries()], [["item-1", 3], ["item-2", 2]]);
  });
});
