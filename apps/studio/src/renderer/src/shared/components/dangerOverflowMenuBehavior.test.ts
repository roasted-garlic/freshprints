import assert from "node:assert/strict";
import test from "node:test";

import {
  getDangerOverflowMenuPanelClass,
  transitionDangerOverflowMenu,
} from "./dangerOverflowMenuBehavior";

test("trigger opens and a repeated trigger closes one menu", () => {
  assert.deepEqual(transitionDangerOverflowMenu(false, "trigger"), {
    open: true,
    restoreTriggerFocus: false,
  });
  assert.equal(transitionDangerOverflowMenu(true, "trigger").open, false);
});

test("a disabled trigger cannot open", () => {
  assert.equal(transitionDangerOverflowMenu(false, "trigger", true).open, false);
});

test("outside click closes without forcing focus", () => {
  assert.deepEqual(transitionDangerOverflowMenu(true, "outside"), {
    open: false,
    restoreTriggerFocus: false,
  });
});

test("Escape closes and restores trigger focus only from an open menu", () => {
  assert.deepEqual(transitionDangerOverflowMenu(true, "escape"), {
    open: false,
    restoreTriggerFocus: true,
  });
  assert.equal(transitionDangerOverflowMenu(false, "escape").restoreTriggerFocus, false);
});

test("select closes before the action handler runs", () => {
  assert.deepEqual(transitionDangerOverflowMenu(true, "select"), {
    open: false,
    restoreTriggerFocus: false,
  });
});

test("placement classes explicitly support clipped bottom action rows", () => {
  assert.equal(
    getDangerOverflowMenuPanelClass("top"),
    "danger-overflow-menu-panel danger-overflow-menu-panel--top",
  );
  assert.equal(
    getDangerOverflowMenuPanelClass("bottom"),
    "danger-overflow-menu-panel danger-overflow-menu-panel--bottom",
  );
});
