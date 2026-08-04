import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

/**
 * Regression coverage for the AI Processing reconciliation defect
 * (post-launch-catalog-and-processing-stability, Workstream D).
 *
 * Two compounding bugs, both fixed here:
 * 1. executeRerunToProcessing relied solely on tab navigation's own
 *    side-effect refetch to reconcile the Processing list/count, instead
 *    of calling reloadDesigns()/onQueueChanged() deterministically the
 *    same way every other inbox action in this file does.
 * 2. enqueueDesign treated a benign, server-confirmed "already reached
 *    its desired terminal state" outcome (reason: "already_terminal") the
 *    same as a genuine failure, throwing "This design is no longer
 *    eligible for automatic AI enqueue." even after a successful run.
 */
describe("AI Processing reconciliation — reprocess deterministically reloads before navigating", () => {
  it("executeRerunToProcessing calls reloadDesigns() and onQueueChanged() before onNavigateToTab, matching runInboxAction's established order", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts",
    );

    const rerunBlock = source.slice(
      source.indexOf("const executeRerunToProcessing = useCallback("),
      source.indexOf("const requestRerunAiSuggestions = useCallback("),
    );

    assert.match(rerunBlock, /await reloadDesigns\(\);/);

    const reloadIndex = rerunBlock.indexOf("await reloadDesigns();");
    const queueChangedIndex = rerunBlock.indexOf("options?.onQueueChanged?.();");
    const navigateIndex = rerunBlock.indexOf("options?.onNavigateToTab?.(");

    assert.ok(reloadIndex > -1 && queueChangedIndex > -1 && navigateIndex > -1);
    assert.ok(
      reloadIndex < queueChangedIndex && queueChangedIndex < navigateIndex,
      "reloadDesigns must run, then onQueueChanged, before tab navigation — not rely on " +
        "navigation's own refetch to reconcile the Processing list/count",
    );
  });

  it("reloadDesigns is a real dependency of executeRerunToProcessing's useCallback, not accidentally stale-closed", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts",
    );
    const rerunBlock = source.slice(
      source.indexOf("const executeRerunToProcessing = useCallback("),
      source.indexOf("const requestRerunAiSuggestions = useCallback("),
    );
    const depsMatch = rerunBlock.match(/\}, \[([^\]]*)\]\);/);
    assert.ok(depsMatch, "expected to find the useCallback dependency array");
    assert.match(depsMatch![1]!, /reloadDesigns/);
  });
});

describe("AI Processing reconciliation — duplicate/stale enqueue is an idempotent no-op, not a hard error", () => {
  it("enqueueDesign does not throw when the callable reports reason: already_terminal", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiProcessingQueue.ts",
    );

    assert.match(source, /if \(!result\.queued && result\.reason !== "already_terminal"\) \{/);
    // Confirms the throw guard is now conditioned on more than the bare
    // `!result.queued` check the defect shipped with.
    assert.doesNotMatch(source, /if \(!result\.queued\) \{\s*\n\s*setEnqueueingDesignId\(null\);\s*\n\s*throw new Error\(/);
  });

  it("still throws for a genuinely ineligible/failed enqueue (e.g. already_processing)", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiProcessingQueue.ts",
    );
    assert.match(source, /This design is already being processed\./);
    assert.match(source, /AI processing could not be queued\. Please try again\./);
  });

  it("applies the design patch for an already-terminal result the same way as a completed result", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiProcessingQueue.ts",
    );
    const enqueueBlock = source.slice(
      source.indexOf("const enqueueDesign = useCallback("),
      source.indexOf("const refreshDesignList = useCallback("),
    );
    assert.match(enqueueBlock, /buildDesignPatchFromEnqueueResult\(result\)/);
    assert.match(enqueueBlock, /applyDesignPatch\(designId, patch\)/);
  });
});
