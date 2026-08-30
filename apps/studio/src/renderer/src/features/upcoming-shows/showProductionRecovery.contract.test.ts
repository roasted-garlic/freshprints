import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));

test("UpcomingShowsPage includes Needs Attention tab", () => {
  const source = readFileSync(path.join(here, "pages", "UpcomingShowsPage.tsx"), "utf8");
  assert.match(source, /needs_attention/);
  assert.match(source, /Needs Attention/);
  assert.match(source, /NeedsAttentionShowPanel/);
  assert.match(source, /DidNotPrintRecoveryDialog/);
});

test("NeedsAttentionShowPanel opens Did Not Print recovery", () => {
  const source = readFileSync(path.join(here, "components", "NeedsAttentionShowPanel.tsx"), "utf8");
  assert.match(source, /Did Not Print…/);
  assert.match(source, /onOpenDidNotPrint/);
  assert.doesNotMatch(source, /onSelectRecoveryAction\("release_unfulfilled"\)/);
});

test("showProductionRecoveryService labels requeue_unfulfilled", () => {
  const source = readFileSync(path.join(here, "services", "showProductionRecoveryService.ts"), "utf8");
  assert.match(source, /requeue_unfulfilled:/);
});

test("upcomingShowService clears needsStaffRequeue on allocation", () => {
  const source = readFileSync(path.join(here, "services", "upcomingShowService.ts"), "utf8");
  assert.match(source, /clearNeedsStaffRequeueMarker/);
});

test("upcomingShowService maps unfulfilled_requeue resolution kind for DID NOT PRINT display", () => {
  const source = readFileSync(path.join(here, "services", "upcomingShowService.ts"), "utf8");
  assert.match(source, /"unfulfilled_requeue"/);
});

test("UpcomingShowsPage ticks scheduleNow for queue tabs even when not printing", () => {
  const source = readFileSync(path.join(here, "pages", "UpcomingShowsPage.tsx"), "utf8");
  assert.match(source, /SHOW_QUEUE_SCHEDULE_TICK_MS/);
  assert.match(source, /window\.setInterval\(tick, intervalMs\)/);
  assert.doesNotMatch(
    source,
    /hasPrintingWhatnotShow\s*\?\s*window\.setInterval\(tick,\s*1000\)\s*:\s*undefined/,
  );
});

test("UpcomingShowsPage exposes owner-only Edit show entry point", () => {
  const pageSource = readFileSync(path.join(here, "pages", "UpcomingShowsPage.tsx"), "utf8");
  const serviceSource = readFileSync(path.join(here, "services", "upcomingShowService.ts"), "utf8");
  const permissionSource = readFileSync(
    path.join(here, "..", "permissions", "services", "permissionService.ts"),
    "utf8",
  );

  assert.match(pageSource, /canEditUpcomingShowMetadata/);
  assert.match(pageSource, /updateUpcomingShowMetadata/);
  assert.match(serviceSource, /canEditUpcomingShowMetadata/);
  assert.match(serviceSource, /updateUpcomingShowMetadata/);
  assert.match(permissionSource, /canEditUpcomingShowMetadata/);
});
