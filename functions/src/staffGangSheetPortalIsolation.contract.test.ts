import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));

test("listPortalAllocatableShows excludes staff_gang_sheet source", () => {
  const source = readFileSync(path.join(here, "listPortalAllocatableShows.ts"), "utf8");
  assert.match(source, /data\.source === "staff_gang_sheet"/);
});

test("queuePortalPrintRequestToShow rejects staff_gang_sheet shows", () => {
  const source = readFileSync(path.join(here, "queuePortalPrintRequestToShow.ts"), "utf8");
  assert.match(source, /showData\.source === "staff_gang_sheet"/);
  assert.match(source, /not available for Portal queuing/);
});

test("onShowAllocationCreated skips Recently Requested bump for staff_gang_sheet", () => {
  const source = readFileSync(path.join(here, "onShowAllocationCreated.ts"), "utf8");
  assert.match(source, /source === "staff_gang_sheet"/);
  assert.match(source, /Recently Requested/);
});
