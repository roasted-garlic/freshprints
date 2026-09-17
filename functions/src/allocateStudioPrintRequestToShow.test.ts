import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseAllocateStudioPrintRequestToShowRequest,
  resolveOverrideShowCapacity,
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

  it("restores a parked Working draft the same way Portal queue does", () => {
    const source = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "allocateStudioPrintRequestToShow.ts"),
      "utf8",
    );
    assert.match(source, /readParkedDraftForRestoreInTransaction/);
    assert.match(source, /applyRestoreParkedDraftWritesInTransaction/);
    assert.match(source, /clearEditingParkingFields:\s*false/);
    // Parking fields on the draft are cleared via restore — not wrongly on the editing request alone.
    assert.doesNotMatch(
      source,
      /transaction\.update\(\s*requestRef,\s*\{[^}]*parkedByEditingRequestId:\s*FieldValue\.delete\(\)/s,
    );
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
    assert.equal(parsed.overrideShowCapacity, undefined);
  });

  it("accepts only literal boolean true for overrideShowCapacity", () => {
    const enabled = parseAllocateStudioPrintRequestToShowRequest({
      printRequestId: "request-1",
      legs: [{ upcomingShowId: "show-1", quantitiesByItemId: { "item-1": 1 } }],
      overrideShowCapacity: true,
    });
    assert.equal(enabled.overrideShowCapacity, true);

    for (const spoof of [false, "true", 1, { ok: true }, null, undefined] as const) {
      const parsed = parseAllocateStudioPrintRequestToShowRequest({
        printRequestId: "request-1",
        legs: [{ upcomingShowId: "show-1", quantitiesByItemId: { "item-1": 1 } }],
        overrideShowCapacity: spoof as never,
      });
      assert.equal(parsed.overrideShowCapacity, undefined);
    }

    assert.equal(resolveOverrideShowCapacity(true), true);
    assert.equal(resolveOverrideShowCapacity("true"), false);
    assert.equal(resolveOverrideShowCapacity(1), false);
  });

  it("capacity override bypasses only ceiling and capacity-full eligibility in source", () => {
    const source = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "allocateStudioPrintRequestToShow.ts"),
      "utf8",
    );
    assert.match(source, /overrideShowCapacity/);
    assert.match(source, /allowCapacityFullOverride: overrideShowCapacity/);
    assert.match(source, /!overrideShowCapacity &&/);
    assert.match(source, /This show does not have enough remaining capacity/);
    assert.match(source, /showCapacityOverride: true/);
    assert.doesNotMatch(source, /maxQuantityOverridden:\s*true/);
    assert.ok(
      !/transaction\.update\(\s*showSnap\.ref,\s*\{[^}]*maxTotalQuantity/s.test(source),
      "show update must not write maxTotalQuantity",
    );
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
