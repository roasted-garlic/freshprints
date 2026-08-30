import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { refreshSelectedShowGangSheetCache } from "./gangSheetCacheRefresh";

describe("selected-show gang-sheet cache refresh", () => {
  it("resets without a selected show", async () => {
    const calls: string[] = [];
    await refreshSelectedShowGangSheetCache({
      show: null,
      settings: "settings",
      reset: () => calls.push("reset"),
      refresh: async (show) => calls.push(`refresh:${show.id}`),
    });
    assert.deepEqual(calls, ["reset"]);
  });

  it("does not reset when show is briefly null but a selection id remains", async () => {
    const calls: string[] = [];
    await refreshSelectedShowGangSheetCache({
      show: null,
      selectedShowId: "still-selected",
      settings: "settings",
      reset: () => calls.push("reset"),
      refresh: async (show) => calls.push(`refresh:${show.id}`),
    });
    assert.deepEqual(calls, []);
  });

  it("refreshes past shows the same as upcoming shows", async () => {
    const calls: string[] = [];
    await refreshSelectedShowGangSheetCache({
      show: { id: "past" },
      settings: "settings",
      reset: () => calls.push("reset"),
      refresh: async (show, settings) => calls.push(`refresh:${show.id}:${settings}`),
    });
    assert.deepEqual(calls, ["refresh:past:settings"]);
  });

  it("refreshes the latest selected show and settings once", async () => {
    const calls: string[] = [];
    await refreshSelectedShowGangSheetCache({
      show: { id: "current" },
      settings: "latest-settings",
      reset: () => calls.push("reset"),
      refresh: async (show, settings) => calls.push(`refresh:${show.id}:${settings}`),
    });
    assert.deepEqual(calls, ["refresh:current:latest-settings"]);
  });
});
