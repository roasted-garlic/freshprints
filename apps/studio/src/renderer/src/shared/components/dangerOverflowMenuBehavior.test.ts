import assert from "node:assert/strict";
import test from "node:test";

import {
  getDangerOverflowMenuPanelClass,
  resolveDangerOverflowMenuPosition,
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

const baseGeometry = {
  trigger: { bottom: 132, left: 240, right: 272, top: 100 },
  menuHeight: 80,
  menuWidth: 192,
  viewportHeight: 500,
  viewportWidth: 800,
} as const;

test("normal conditions prefer directly below the trigger", () => {
  assert.deepEqual(resolveDangerOverflowMenuPosition(baseGeometry), {
    left: 80,
    placement: "bottom",
    top: 138,
  });
});

test("insufficient space below flips upward only when above has more room", () => {
  const position = resolveDangerOverflowMenuPosition({
    ...baseGeometry,
    trigger: { bottom: 472, left: 240, right: 272, top: 440 },
  });
  assert.equal(position.placement, "top");
  assert.equal(position.top, 354);
});

test("a short menu does not flip when it still fits below", () => {
  const position = resolveDangerOverflowMenuPosition({
    ...baseGeometry,
    menuHeight: 20,
    trigger: { bottom: 460, left: 240, right: 272, top: 428 },
  });
  assert.equal(position.placement, "bottom");
  assert.equal(position.top, 466);
});

test("viewport collision clamps the portaled panel on both axes", () => {
  assert.deepEqual(
    resolveDangerOverflowMenuPosition({
      ...baseGeometry,
      trigger: { bottom: 40, left: 4, right: 36, top: 8 },
      menuHeight: 490,
      menuWidth: 790,
    }),
    { left: 8, placement: "bottom", top: 8 },
  );
});
