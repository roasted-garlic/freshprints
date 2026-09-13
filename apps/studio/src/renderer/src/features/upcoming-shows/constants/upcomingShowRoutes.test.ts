import assert from "node:assert/strict";
import test from "node:test";

import {
  getInternalGangSheetsPath,
  getUpcomingShowsPath,
  resolveStaffGangSheetListTab,
  resolveWhatnotShowQueueListTab,
  SHOW_QUEUE_TAB_QUERY_PARAM,
} from "./upcomingShowRoutes";

test("show queue paths include list tab query param", () => {
  assert.equal(
    getUpcomingShowsPath({ tab: "past", showId: "show-1" }),
    `/show-queue?${SHOW_QUEUE_TAB_QUERY_PARAM}=past&showId=show-1`,
  );
  assert.equal(
    getInternalGangSheetsPath({ tab: "history", showId: "sheet-1" }),
    `/internal-gang-sheets?${SHOW_QUEUE_TAB_QUERY_PARAM}=history&showId=sheet-1`,
  );
});

test("resolveShowQueueListTab defaults invalid or missing tab param", () => {
  assert.equal(resolveWhatnotShowQueueListTab(null), "upcoming");
  assert.equal(resolveWhatnotShowQueueListTab("bogus"), "upcoming");
  assert.equal(resolveWhatnotShowQueueListTab("needs_attention"), "needs_attention");
  assert.equal(resolveStaffGangSheetListTab(null), "current");
  assert.equal(resolveStaffGangSheetListTab("history"), "history");
});
