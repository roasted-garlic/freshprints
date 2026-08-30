import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatPrintRequestShowTransferActionLabel,
  isPrintRequestShowTransferDestination,
  resolvePrintRequestShowTransferMode,
} from "./printRequestShowTransfer";

describe("printRequestShowTransfer", () => {
  const now = new Date("2026-08-26T18:00:00.000Z");

  it("uses move for upcoming open shows and copy for aired shows", () => {
    assert.equal(
      resolvePrintRequestShowTransferMode(
        {
          scheduledStartAt: { toDate: () => new Date("2026-08-27T18:00:00.000Z") },
          productionStatus: "open",
        },
        now,
      ),
      "move",
    );
    assert.equal(
      resolvePrintRequestShowTransferMode(
        { scheduledStartAt: { toDate: () => new Date("2026-08-25T18:00:00.000Z") } },
        now,
      ),
      "copy",
    );
  });

  it("uses copy for upcoming shows that are production-locked (e.g. completed)", () => {
    assert.equal(
      resolvePrintRequestShowTransferMode(
        {
          scheduledStartAt: { toDate: () => new Date("2026-08-27T18:00:00.000Z") },
          productionStatus: "completed",
        },
        now,
      ),
      "copy",
    );
    assert.equal(
      resolvePrintRequestShowTransferMode(
        {
          scheduledStartAt: { toDate: () => new Date("2026-08-27T18:00:00.000Z") },
          productionStatus: "printing",
        },
        now,
      ),
      "copy",
    );
  });

  it("labels actions for staff UI", () => {
    assert.equal(formatPrintRequestShowTransferActionLabel("move"), "Move to another show");
    assert.equal(formatPrintRequestShowTransferActionLabel("copy"), "Copy to another show");
  });

  it("allows only upcoming open Whatnot shows as transfer destinations", () => {
    const now = new Date("2026-08-26T18:00:00.000Z");
    const openUpcoming = {
      source: "whatnot" as const,
      scheduledStartAt: { toDate: () => new Date("2026-08-27T18:00:00.000Z") },
      productionStatus: "open" as const,
      allocatedQuantity: 0,
      maxTotalQuantity: 100,
    };

    assert.equal(isPrintRequestShowTransferDestination(openUpcoming, now), true);
    assert.equal(
      isPrintRequestShowTransferDestination(
        { ...openUpcoming, source: "staff_gang_sheet" },
        now,
      ),
      false,
    );
    assert.equal(
      isPrintRequestShowTransferDestination(
        {
          ...openUpcoming,
          scheduledStartAt: { toDate: () => new Date("2026-08-25T18:00:00.000Z") },
        },
        now,
      ),
      false,
    );
    assert.equal(
      isPrintRequestShowTransferDestination(
        { ...openUpcoming, productionStatus: "completed" },
        now,
      ),
      false,
    );
  });
});
