import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const HOOK_PATH =
  "apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts";

function readHookSource(): string {
  return readFileSync(HOOK_PATH, "utf8");
}

function readReconciliationEffectBody(source: string): string {
  const start = source.indexOf(
    "// Owner QA Amendment 7 follow-up: this effect previously depended on `options`",
  );
  const end = source.indexOf(
    "// Owner QA Amendment 3, Failure 1 (initial fix) found that the background AI pump was",
  );
  assert.ok(start >= 0 && end > start, "the live-design reconciliation effect must be found");
  return source.slice(start, end);
}

/**
 * Owner QA Amendment 7 follow-up (second loop, found after the first Amendment 7 fix shipped):
 * the owner reported the identical symptom persisting — a fresh trace showed a tight
 * `load.start -> load.response -> load.accepted` cycle every ~20ms, hundreds of times, always with
 * the same single design ID and `processingCount: 1`. Root cause: a *different* effect in this
 * same hook (the live-design backend-completion reconciliation effect, Amendment 2) had `options`
 * in its dependency array. Because its own body calls `reloadDesigns()` whenever the selected
 * design's live subscription reports `aiReviewStatus === "needs_review"`, and nothing in this
 * effect (or elsewhere, for this specific path) ever advances `selectedDesignId` away from that
 * design, the effect kept re-running its full body on every render for as long as the completed
 * design remained selected: reloadDesigns() -> designs reference changes -> parent re-renders ->
 * options gets a new identity -> effect re-runs -> liveDesign.aiReviewStatus is still
 * "needs_review" -> reloadDesigns() again, indefinitely — a true infinite loop for a single
 * design, not merely excess resubscription churn (the first Amendment 7 fix's bug).
 *
 * Fixed by removing `options` from the effect's dependency array (reading `optionsRef.current`
 * instead, matching the pattern already established by the first Amendment 7 fix) and adding a
 * one-shot guard (`alreadyReconciledLiveDesignIdRef`) so the reload/reconcile fires at most once
 * per genuine completion — cleared as soon as that same design's liveDesign moves off
 * "needs_review", so a later, genuinely new completion of the same design ID (e.g. after a
 * Retry/Rerun sends it back to Processing) is still correctly reconciled.
 */
describe("AI queue live-design reconciliation: infinite-reload regression (Owner QA Amendment 7 follow-up)", () => {
  it("the live-design reconciliation effect's dependency array excludes options", () => {
    const source = readHookSource();
    const effectBody = readReconciliationEffectBody(source);

    const depsMatch = effectBody.match(/\}, \[([^\]]*)\]\);/);
    assert.ok(depsMatch, "the effect must have a dependency array");

    const deps = depsMatch![1].split(",").map((dep) => dep.trim());
    assert.ok(!deps.includes("options"), "options must not be a dependency (a fresh literal from the parent every render)");
    assert.deepEqual(
      [...deps].sort(),
      ["filters.tab", "liveDesign", "reloadDesigns"].sort(),
    );
  });

  it("the effect calls onQueueChanged via optionsRef, not the closed-over options variable", () => {
    const source = readHookSource();
    const effectBody = readReconciliationEffectBody(source);

    assert.match(effectBody, /optionsRef\.current\?\.onQueueChanged\?\.\(\)/);
    assert.doesNotMatch(effectBody, /(?<!\w)options\?\.onQueueChanged/);
  });

  it("the effect reconciles at most once per completed design via a one-shot guard", () => {
    const source = readHookSource();
    const effectBody = readReconciliationEffectBody(source);

    assert.match(
      effectBody,
      /alreadyReconciledLiveDesignIdRef\.current !== liveDesign\.id/,
      "must gate reloadDesigns()/onQueueChanged() on not having already reconciled this exact design",
    );
    assert.match(
      effectBody,
      /alreadyReconciledLiveDesignIdRef\.current = liveDesign\.id;/,
      "must record the design as reconciled before calling reloadDesigns()",
    );
  });

  it("the guard is cleared once the design moves off needs_review, so a future completion of the same design ID is not permanently skipped", () => {
    const source = readHookSource();
    const effectBody = readReconciliationEffectBody(source);

    // The regression an earlier draft of this fix had: writing the ref but never clearing it,
    // which would permanently block reconciliation for any design that completes, gets sent back
    // to Processing (Retry/Rerun), and completes again later.
    assert.match(
      effectBody,
      /if \(liveDesign\.aiReviewStatus !== "needs_review"\) \{/,
      "must handle the not-completed branch explicitly to clear the guard",
    );
    assert.match(
      effectBody,
      /alreadyReconciledLiveDesignIdRef\.current = null;/,
      "must clear the guard once the design is no longer in the completed state",
    );
  });

  it("alreadyReconciledLiveDesignIdRef is declared once, initialized to null, and read/written only inside this effect", () => {
    const source = readHookSource();

    const declarations = source.match(/const alreadyReconciledLiveDesignIdRef = useRef</g) ?? [];
    assert.equal(declarations.length, 1, "must be declared exactly once");
    assert.match(source, /const alreadyReconciledLiveDesignIdRef = useRef<string \| null>\(null\);/);
  });

  it("the fix does not change reloadDesigns/applyDesignPatch semantics or any other effect's dependency array", () => {
    const useDesignsSource = readFileSync(
      "apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts",
      "utf8",
    );
    assert.match(useDesignsSource, /const applyDesignPatch = useCallback\(/);
    assert.match(useDesignsSource, /const reloadDesigns = useCallback\(/);

    // The sibling observer subscription effect (fixed in the first Amendment 7 pass) must remain
    // exactly as that fix left it — this follow-up must not have touched it.
    const source = readHookSource();
    assert.match(source, /\}, \[applyDesignPatch, filters\.tab, reloadDesigns\]\);/);
  });
});
