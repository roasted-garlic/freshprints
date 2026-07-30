import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { refreshSelectedShowGangSheetCache } from "./gangSheetCacheRefresh";

describe("selected-show gang-sheet cache refresh", () => {
  it("resets without a selected show", async () => {
    const calls: string[] = [];
    await refreshSelectedShowGangSheetCache({
      show: null,
      isPast: false,
      settings: "settings",
      reset: () => calls.push("reset"),
      clearForShow: async (id) => calls.push(`clear:${id}`),
      refresh: async (show) => calls.push(`refresh:${show.id}`),
    });
    assert.deepEqual(calls, ["reset"]);
  });

  it("clears only the selected historical show", async () => {
    const calls: string[] = [];
    await refreshSelectedShowGangSheetCache({
      show: { id: "past" },
      isPast: true,
      settings: "settings",
      reset: () => calls.push("reset"),
      clearForShow: async (id) => calls.push(`clear:${id}`),
      refresh: async (show) => calls.push(`refresh:${show.id}`),
    });
    assert.deepEqual(calls, ["clear:past"]);
  });

  it("refreshes the latest selected show and settings once", async () => {
    const calls: string[] = [];
    await refreshSelectedShowGangSheetCache({
      show: { id: "current" },
      isPast: false,
      settings: "latest-settings",
      reset: () => calls.push("reset"),
      clearForShow: async (id) => calls.push(`clear:${id}`),
      refresh: async (show, settings) => calls.push(`refresh:${show.id}:${settings}`),
    });
    assert.deepEqual(calls, ["refresh:current:latest-settings"]);
  });
});
