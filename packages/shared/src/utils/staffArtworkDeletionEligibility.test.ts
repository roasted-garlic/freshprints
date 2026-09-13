import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  describeStaffArtworkDeletionBlockers,
  resolveStaffArtworkDeletionBlockers,
} from "./staffArtworkDeletionEligibility";

describe("resolveStaffArtworkDeletionBlockers", () => {
  it("allows delete when there are no production references", () => {
    const blockers = resolveStaffArtworkDeletionBlockers({
      printRequestItems: [],
      allocations: [],
      gangSheetItems: [],
      showProductionStatusById: {},
    });
    assert.deepEqual(blockers, []);
  });

  it("blocks print-request attachment with no show allocation", () => {
    const blockers = resolveStaffArtworkDeletionBlockers({
      printRequestItems: [{ id: "item-1" }],
      allocations: [],
      gangSheetItems: [],
      showProductionStatusById: {},
    });
    assert.deepEqual(blockers, ["print_request_item"]);
  });

  it("blocks when allocated to an open show", () => {
    const blockers = resolveStaffArtworkDeletionBlockers({
      printRequestItems: [{ id: "item-1" }],
      allocations: [
        {
          printRequestItemId: "item-1",
          upcomingShowId: "show-1",
          status: "queued",
        },
      ],
      gangSheetItems: [],
      showProductionStatusById: { "show-1": "printing" },
    });
    assert.deepEqual(blockers, ["print_request_item", "show_allocation"]);
  });

  it("allows when the print request was only on a completed show or internal sheet", () => {
    const blockers = resolveStaffArtworkDeletionBlockers({
      printRequestItems: [{ id: "item-1" }],
      allocations: [
        {
          printRequestItemId: "item-1",
          upcomingShowId: "sheet-1",
          status: "done",
        },
      ],
      gangSheetItems: [
        {
          upcomingShowId: "sheet-1",
        },
      ],
      showProductionStatusById: { "sheet-1": "completed" },
    });
    assert.deepEqual(blockers, []);
  });

  it("ignores canceled allocations when deciding completed-show release", () => {
    const blockers = resolveStaffArtworkDeletionBlockers({
      printRequestItems: [{ id: "item-1" }],
      allocations: [
        {
          printRequestItemId: "item-1",
          upcomingShowId: "show-open",
          status: "canceled",
        },
      ],
      gangSheetItems: [],
      showProductionStatusById: { "show-open": "open" },
    });
    assert.deepEqual(blockers, ["print_request_item"]);
  });

  it("describes blockers for UI", () => {
    assert.match(
      describeStaffArtworkDeletionBlockers(["print_request_item"]),
      /completed show or internal sheet/,
    );
  });
});
