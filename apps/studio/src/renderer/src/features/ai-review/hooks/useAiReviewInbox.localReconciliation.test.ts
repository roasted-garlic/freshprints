import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const HOOK_PATH =
  "apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts";
const PAGE_PATH =
  "apps/studio/src/renderer/src/features/ai-review/pages/AiReviewPage.tsx";
const TAB_COUNTS_PATH =
  "apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewTabCounts.ts";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

/**
 * Amendment 9 P0: successful approve/reject/archive must reconcile locally.
 * Processing / queue paths must keep authoritative count refresh via onQueueChanged.
 */
describe("Amendment 9 P0: AI Review local reconciliation wiring", () => {
  it("runInboxAction success path does not call reloadDesigns or onQueueChanged", () => {
    const source = read(HOOK_PATH);
    const start = source.indexOf("const runInboxAction = useCallback(");
    assert.ok(start >= 0, "runInboxAction must exist");
    const end = source.indexOf("const runRejectedTabNavigationAction = useCallback(", start);
    assert.ok(end > start, "runInboxAction block must end before next callback");
    const block = source.slice(start, end);

    const tryStart = block.indexOf("try {");
    const catchStart = block.indexOf("} catch (inboxError)");
    assert.ok(tryStart >= 0 && catchStart > tryStart);
    const successBody = block.slice(tryStart, catchStart);

    assert.match(successBody, /reconcileSuccessfulInboxManualAction\(/);
    assert.doesNotMatch(
      successBody,
      /reloadDesigns\(/,
      "successful inbox actions must not reload the full list",
    );
    assert.doesNotMatch(
      successBody,
      /onQueueChanged\?\.\(\)/,
      "successful inbox actions must not refresh all three tab counts",
    );
    assert.match(successBody, /onInboxCountsDelta/);
    assert.match(successBody, /pendingAdvanceIndexRef|setPendingAdvanceIndex/);
  });

  it("runInboxAction failure path performs one bounded reloadDesigns + onQueueChanged", () => {
    const source = read(HOOK_PATH);
    const start = source.indexOf("const runInboxAction = useCallback(");
    const end = source.indexOf("const runRejectedTabNavigationAction = useCallback(", start);
    const block = source.slice(start, end);
    const catchStart = block.indexOf("} catch (inboxError)");
    const finallyStart = block.indexOf("} finally {", catchStart);
    const catchBody = block.slice(catchStart, finallyStart);

    assert.match(catchBody, /recoverFailedInboxManualAction\(/);
    assert.match(catchBody, /reloadDesigns/);
    assert.match(catchBody, /onQueueChanged/);
    assert.equal(
      (catchBody.match(/recoverFailedInboxManualAction\(/g) ?? []).length,
      1,
      "failure recovery must run exactly once",
    );
  });

  it("approve/reject/archive use returned Design via runInboxAction", () => {
    const source = read(HOOK_PATH);
    assert.match(
      source,
      /manualAction: "approve"[\s\S]*approveFromInbox/,
    );
    assert.match(
      source,
      /manualAction: "reject"[\s\S]*rejectFromInbox/,
    );
    assert.match(
      source,
      /manualAction: "archive"[\s\S]*archiveFromInbox/,
    );
    assert.match(
      source,
      /action: \(\) => Promise<Design>/,
    );
  });

  it("does not add timers, polling, or listeners for P0 reconciliation", () => {
    const source = read(HOOK_PATH);
    const start = source.indexOf("const runInboxAction = useCallback(");
    const end = source.indexOf("const runRejectedTabNavigationAction = useCallback(", start);
    const block = source.slice(start, end);

    assert.doesNotMatch(block, /setInterval|setTimeout|addListener|onSnapshot/);
    assert.doesNotMatch(source, /K\s*=\s*\d+/);
  });

  it("Processing / queue paths still call onQueueChanged for count refresh", () => {
    const source = read(HOOK_PATH);
    // Live-design completion and background observer still refresh counts.
    assert.match(source, /optionsRef\.current\?\.onQueueChanged\?\.\(\)/);
    const observerStart = source.indexOf("return subscribeToBackgroundAiQueue((event) => {");
    assert.ok(observerStart >= 0);
    const observerDeps = source.indexOf("}, [applyDesignPatch, filters.tab, reloadDesigns]);", observerStart);
    const observerBody = source.slice(observerStart, observerDeps);
    assert.match(observerBody, /onQueueChanged/);
  });

  it("AiReviewPage wires local deltas separately from Processing count refresh", () => {
    const page = read(PAGE_PATH);
    assert.match(page, /onQueueChanged:\s*\(\)\s*=>\s*void tabCounts\.reloadCounts\(\)/);
    assert.match(page, /onInboxCountsDelta:\s*\(deltas\)\s*=>\s*tabCounts\.applyCountsDelta\(deltas\)/);
  });

  it("useAiReviewTabCounts exposes applyCountsDelta without timers", () => {
    const source = read(TAB_COUNTS_PATH);
    assert.match(source, /applyCountsDelta/);
    assert.match(source, /applyAiReviewTabCountDeltas/);
    assert.doesNotMatch(source, /setInterval|setTimeout/);
  });
});
