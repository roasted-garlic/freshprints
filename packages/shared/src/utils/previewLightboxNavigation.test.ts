import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  filterPreviewableItemIds,
  getPreviewLightboxNavigationState,
  isPreviewLightboxEditableKeyboardTarget,
  preloadImageUrl,
} from "./previewLightboxNavigation.ts";

describe("getPreviewLightboxNavigationState", () => {
  const ids = ["a", "b", "c", "d", "e"];

  it("opens middle item as active", () => {
    const state = getPreviewLightboxNavigationState(ids, "c");
    assert.equal(state.activeIndex, 2);
    assert.equal(state.position, 3);
    assert.equal(state.total, 5);
  });

  it("resolves previous id", () => {
    const state = getPreviewLightboxNavigationState(ids, "c");
    assert.equal(state.previousId, "b");
    assert.equal(state.canGoPrevious, true);
  });

  it("resolves next id", () => {
    const state = getPreviewLightboxNavigationState(ids, "c");
    assert.equal(state.nextId, "d");
    assert.equal(state.canGoNext, true);
  });

  it("disables previous on first item", () => {
    const state = getPreviewLightboxNavigationState(ids, "a");
    assert.equal(state.canGoPrevious, false);
    assert.equal(state.previousId, null);
    assert.equal(state.nextId, "b");
  });

  it("disables next on last item", () => {
    const state = getPreviewLightboxNavigationState(ids, "e");
    assert.equal(state.canGoNext, false);
    assert.equal(state.nextId, null);
    assert.equal(state.previousId, "d");
  });

  it("does not wrap around", () => {
    const first = getPreviewLightboxNavigationState(ids, "a");
    const last = getPreviewLightboxNavigationState(ids, "e");
    assert.equal(first.previousId, null);
    assert.equal(last.nextId, null);
  });

  it("keeps stable active id when list order changes but id remains", () => {
    const reordered = ["e", "c", "a", "b", "d"];
    const state = getPreviewLightboxNavigationState(reordered, "c");
    assert.equal(state.activeIndex, 1);
    assert.equal(state.previousId, "e");
    assert.equal(state.nextId, "a");
  });

  it("exposes final active id via caller-held activeItemId", () => {
    let active = "b";
    const afterNext = getPreviewLightboxNavigationState(ids, active);
    active = afterNext.nextId ?? active;
    assert.equal(active, "c");
    const afterNextAgain = getPreviewLightboxNavigationState(ids, active);
    active = afterNextAgain.nextId ?? active;
    assert.equal(active, "d");
  });

  it("honors filtered sibling collection", () => {
    const filtered = ["a", "d", "g"];
    const state = getPreviewLightboxNavigationState(filtered, "a");
    assert.equal(state.nextId, "d");
    const mid = getPreviewLightboxNavigationState(filtered, "d");
    assert.equal(mid.previousId, "a");
    assert.equal(mid.nextId, "g");
  });

  it("hides navigation for singleton (positionLabel null, both disabled)", () => {
    const state = getPreviewLightboxNavigationState(["only"], "only");
    assert.equal(state.canGoPrevious, false);
    assert.equal(state.canGoNext, false);
    assert.equal(state.positionLabel, null);
    assert.equal(state.total, 1);
  });

  it("fails safely when active id is missing", () => {
    const state = getPreviewLightboxNavigationState(ids, "missing");
    assert.equal(state.activeIndex, -1);
    assert.equal(state.position, null);
    assert.equal(state.canGoPrevious, false);
    assert.equal(state.canGoNext, false);
    assert.equal(state.previousId, null);
    assert.equal(state.nextId, null);
    assert.equal(state.positionLabel, null);
  });

  it("builds position label as active index / total when total > 1", () => {
    const state = getPreviewLightboxNavigationState(ids, "b");
    assert.equal(state.positionLabel, "2 / 5");
  });

  it("treats duplicate-artwork PR-style entries as distinct ids", () => {
    // Same designId may appear twice as separate print-request item ids.
    const prItemIds = ["item-a", "item-b", "item-c"];
    const fromA = getPreviewLightboxNavigationState(prItemIds, "item-a");
    assert.equal(fromA.nextId, "item-b");
    const fromB = getPreviewLightboxNavigationState(prItemIds, "item-b");
    assert.equal(fromB.previousId, "item-a");
    assert.equal(fromB.nextId, "item-c");
    assert.equal(fromB.positionLabel, "2 / 3");
  });
});

describe("filterPreviewableItemIds", () => {
  it("keeps only previewable siblings in order", () => {
    const items = [
      { id: "a", url: "x" },
      { id: "b", url: null },
      { id: "c", url: "y" },
    ];
    const ids = filterPreviewableItemIds(
      items,
      (item) => item.id,
      (item) => Boolean(item.url),
    );
    assert.deepEqual(ids, ["a", "c"]);
  });
});

describe("isPreviewLightboxEditableKeyboardTarget", () => {
  it("returns false for null / non-element targets", () => {
    assert.equal(isPreviewLightboxEditableKeyboardTarget(null), false);
    assert.equal(isPreviewLightboxEditableKeyboardTarget({} as EventTarget), false);
  });
});

describe("preloadImageUrl", () => {
  it("resolves in Node without a DOM Image constructor", async () => {
    await assert.doesNotReject(() => preloadImageUrl("https://example.invalid/preview.webp"));
  });
});
