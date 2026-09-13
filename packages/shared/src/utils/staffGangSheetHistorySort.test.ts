import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  compareStaffGangSheetHistoryOrder,
  sortStaffGangSheetHistoryRecords,
} from "./staffGangSheetHistorySort";

function stamp(iso: string) {
  const ms = Date.parse(iso);
  return { toMillis: () => ms };
}

describe("sortStaffGangSheetHistoryRecords", () => {
  it("sorts printFinishedAt DESC with cycle DESC then id ties", () => {
    const result = sortStaffGangSheetHistoryRecords([
      { id: "c3", staffGangSheetCycleNumber: 3, printFinishedAt: stamp("2026-08-01T00:00:00Z") },
      { id: "c5", staffGangSheetCycleNumber: 5, printFinishedAt: stamp("2026-08-03T00:00:00Z") },
      { id: "c4", staffGangSheetCycleNumber: 4, printFinishedAt: stamp("2026-08-02T00:00:00Z") },
    ]);
    assert.deepEqual(
      result.map((show) => show.id),
      ["c5", "c4", "c3"],
    );
  });

  it("puts missing printFinishedAt after finished sheets", () => {
    const result = sortStaffGangSheetHistoryRecords([
      { id: "unfinished", staffGangSheetCycleNumber: 9, printFinishedAt: null },
      { id: "finished", staffGangSheetCycleNumber: 2, printFinishedAt: stamp("2026-08-01T00:00:00Z") },
    ]);
    assert.deepEqual(
      result.map((show) => show.id),
      ["finished", "unfinished"],
    );
  });

  it("uses cycle DESC when both lack finish timestamps (#5 before #4)", () => {
    const result = sortStaffGangSheetHistoryRecords([
      { id: "id-4", staffGangSheetCycleNumber: 4, printFinishedAt: undefined },
      { id: "id-5", staffGangSheetCycleNumber: 5, printFinishedAt: undefined },
    ]);
    assert.deepEqual(
      result.map((show) => show.id),
      ["id-5", "id-4"],
    );
  });

  it("compareStaffGangSheetHistoryOrder is antisymmetric for equal ids", () => {
    const show = { id: "same", staffGangSheetCycleNumber: 1, printFinishedAt: stamp("2026-08-01T00:00:00Z") };
    assert.equal(compareStaffGangSheetHistoryOrder(show, show), 0);
  });
});
