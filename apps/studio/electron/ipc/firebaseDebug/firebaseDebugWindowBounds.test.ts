import assert from "node:assert/strict";
import test from "node:test";

import {
  centerDebugWindowInWorkArea,
  placeDebugWindowBesideApp,
} from "./firebaseDebugWindowBounds";

test("centers the debug window on the main app display", () => {
  assert.deepEqual(
    centerDebugWindowInWorkArea({ x: 1920, y: 0, width: 1920, height: 1040 }),
    { x: 2638, y: 130, width: 485, height: 780 },
  );
});

test("supports displays with negative coordinates", () => {
  assert.deepEqual(
    centerDebugWindowInWorkArea({ x: -1600, y: -200, width: 1600, height: 900 }),
    { x: -1042, y: -140, width: 485, height: 780 },
  );
});

test("clamps the debug window to a smaller work area", () => {
  assert.deepEqual(
    centerDebugWindowInWorkArea({ x: 0, y: 0, width: 800, height: 600 }),
    { x: 158, y: 0, width: 485, height: 600 },
  );
});

test("places the 485px debug window immediately right of Studio when space is available", () => {
  assert.deepEqual(
    placeDebugWindowBesideApp(
      { x: 0, y: 0, width: 1920, height: 1040 },
      { x: 100, y: 40, width: 1200, height: 900 },
    ),
    { x: 1300, y: 40, width: 485, height: 780 },
  );
});

test("places the debug window left of Studio when the right side is unavailable", () => {
  assert.deepEqual(
    placeDebugWindowBesideApp(
      { x: 1920, y: 0, width: 1920, height: 1040 },
      { x: 2600, y: 300, width: 1200, height: 800 },
    ),
    { x: 2115, y: 260, width: 485, height: 780 },
  );
});
