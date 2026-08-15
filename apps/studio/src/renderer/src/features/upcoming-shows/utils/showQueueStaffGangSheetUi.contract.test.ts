import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(path.join(here, "../pages/UpcomingShowsPage.tsx"), "utf8");

test("Staff Gang Sheets surface click clears incompatible URL selection", () => {
  assert.match(pageSource, /updateSelectedShowPath\(null\)/);
  assert.match(pageSource, /decideQuerySurfaceSync/);
  assert.match(pageSource, /clear_incompatible_query/);
});

test("open Staff Gang Sheet exposes Add Request via canShowAddRequestAction", () => {
  assert.match(pageSource, /canShowAddRequestAction/);
  assert.match(pageSource, />\s*Add Request\s*</);
  assert.match(pageSource, /canEnableAddRequestAction/);
});

test("Add Request keeps Staff surface after allocation success path uses fixedShowId", () => {
  assert.match(pageSource, /fixedShowId=\{selectedShow\.id\}/);
});
