import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canEnableAddRequestAction,
  decideQuerySurfaceSync,
  getShowQueueSurfaceForSource,
} from "./showQueueSurfaceSelection";

describe("getShowQueueSurfaceForSource", () => {
  it("maps Whatnot to Shows and staff_gang_sheet to Staff Gang Sheets", () => {
    assert.equal(getShowQueueSurfaceForSource("whatnot"), "shows");
    assert.equal(getShowQueueSurfaceForSource("staff_gang_sheet"), "staff_gang_sheets");
  });
});

describe("decideQuerySurfaceSync", () => {
  it("on first hydrate follows a Staff Gang Sheet deep link", () => {
    assert.deepEqual(
      decideQuerySurfaceSync({
        queueSurface: "shows",
        queryShowSource: "staff_gang_sheet",
        hasHydratedFromQuery: false,
      }),
      { action: "set_surface", surface: "staff_gang_sheets" },
    );
  });

  it("keeps Staff Gang Sheets selected when URL still points at a Whatnot show (no flicker)", () => {
    assert.deepEqual(
      decideQuerySurfaceSync({
        queueSurface: "staff_gang_sheets",
        queryShowSource: "whatnot",
        hasHydratedFromQuery: true,
      }),
      { action: "clear_incompatible_query" },
    );
  });

  it("keeps Staff Gang Sheets when list is empty (no query show) and does not force Shows", () => {
    assert.deepEqual(
      decideQuerySurfaceSync({
        queueSurface: "staff_gang_sheets",
        queryShowSource: null,
        hasHydratedFromQuery: true,
      }),
      { action: "continue_hydrate" },
    );
  });

  it("hydrates normally when URL show matches the active surface", () => {
    assert.deepEqual(
      decideQuerySurfaceSync({
        queueSurface: "staff_gang_sheets",
        queryShowSource: "staff_gang_sheet",
        hasHydratedFromQuery: true,
      }),
      { action: "continue_hydrate" },
    );
  });

  it("switching back: Whatnot surface + Staff URL clears incompatible query after hydrate", () => {
    assert.deepEqual(
      decideQuerySurfaceSync({
        queueSurface: "shows",
        queryShowSource: "staff_gang_sheet",
        hasHydratedFromQuery: true,
      }),
      { action: "clear_incompatible_query" },
    );
  });
});

describe("canEnableAddRequestAction", () => {
  it("enables Add Request for owner/admin on open Staff Gang Sheet", () => {
    assert.equal(
      canEnableAddRequestAction({
        isStaffGangSheet: true,
        canManageUpcomingShows: true,
        canManageStaffGangSheet: true,
        allocationBlocked: false,
      }),
      true,
    );
  });

  it("enables Add Request for assigned helper on own lane", () => {
    assert.equal(
      canEnableAddRequestAction({
        isStaffGangSheet: true,
        canManageUpcomingShows: true,
        canManageStaffGangSheet: true,
        allocationBlocked: false,
      }),
      true,
    );
  });

  it("disables Add Request for unauthorized helper on another lane", () => {
    assert.equal(
      canEnableAddRequestAction({
        isStaffGangSheet: true,
        canManageUpcomingShows: true,
        canManageStaffGangSheet: false,
        allocationBlocked: false,
      }),
      false,
    );
  });

  it("disables Add Request when allocation is blocked (e.g. completed)", () => {
    assert.equal(
      canEnableAddRequestAction({
        isStaffGangSheet: true,
        canManageUpcomingShows: true,
        canManageStaffGangSheet: true,
        allocationBlocked: true,
      }),
      false,
    );
  });

  it("preserves Whatnot manage gate for normal shows", () => {
    assert.equal(
      canEnableAddRequestAction({
        isStaffGangSheet: false,
        canManageUpcomingShows: true,
        canManageStaffGangSheet: false,
        allocationBlocked: false,
      }),
      true,
    );
    assert.equal(
      canEnableAddRequestAction({
        isStaffGangSheet: false,
        canManageUpcomingShows: false,
        canManageStaffGangSheet: false,
        allocationBlocked: false,
      }),
      false,
    );
  });
});
