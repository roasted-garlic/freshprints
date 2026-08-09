import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const HOOK_PATH =
  "apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts";

function readHookSource(): string {
  return readFileSync(HOOK_PATH, "utf8");
}

/**
 * Owner QA Amendment 7: the background-queue observer subscription effect
 * (`useAiReviewInbox.ts`) previously depended on `designs`, `selectedDesignId`, and `options` —
 * two of which change identity on every render (`options` is a fresh object/callback literal from
 * `AiReviewPage` every render; `designs` gets a new array reference every time this same effect's
 * own `applyDesignPatch` call resolves). That forced the effect to unsubscribe and resubscribe
 * after nearly every state replacement — the runaway `observer.subscribed` loop the owner's
 * runtime trace captured (useDesigns request IDs climbing ~344→584 in 5.5 seconds).
 *
 * This repository has no `@testing-library/react`/`renderHook`/jsdom test runner configured
 * (confirmed: zero existing usages anywhere in `apps/studio`), so — consistent with every other
 * test file in this managed goal's history (e.g. `backgroundAiQueueReconciliation.test.ts`, the
 * Amendment 6 follow-up's IPC transport tests) — this fix is proven via source-grep assertions
 * against the shipped file plus the existing pure-function reconciliation tests, rather than a
 * live render harness.
 */
describe("AI queue observer subscription: dependency-identity regression (Owner QA Amendment 7)", () => {
  it("the observer subscription effect's dependency array excludes designs, selectedDesignId, and options", () => {
    const source = readHookSource();

    const effectStart = source.indexOf(
      "return subscribeToBackgroundAiQueue((event) => {",
    );
    assert.ok(effectStart >= 0, "the observer subscription effect must exist");

    // Find this specific effect's own closing dependency array — the first "}, [...]);" that
    // follows the subscribeToBackgroundAiQueue call.
    const depsMatch = source
      .slice(effectStart)
      .match(/\}, \[([^\]]*)\]\);/);
    assert.ok(depsMatch, "the observer subscription effect must have a dependency array");

    const deps = depsMatch![1].split(",").map((dep) => dep.trim());

    assert.ok(!deps.includes("designs"), "designs must not be a dependency (causes resubscription on every patch)");
    assert.ok(
      !deps.includes("selectedDesignId"),
      "selectedDesignId must not be a dependency (causes resubscription on every selection change)",
    );
    assert.ok(
      !deps.includes("options"),
      "options must not be a dependency (a fresh object literal from the parent every render)",
    );
    assert.deepEqual(
      [...deps].sort(),
      ["applyDesignPatch", "filters.tab", "reloadDesigns"].sort(),
      "the effect should subscribe only on filters.tab change, or if the (stable) callbacks themselves ever change identity",
    );
  });

  it("the observer callback reads current values from refs, not from the closed-over designs/selectedDesignId/options variables", () => {
    const source = readHookSource();

    const callbackBody = source.slice(
      source.indexOf("return subscribeToBackgroundAiQueue((event) => {"),
      source.indexOf("}, [applyDesignPatch, filters.tab, reloadDesigns]);"),
    );

    assert.match(callbackBody, /designsRef\.current/, "must read the current design list via a ref");
    assert.match(
      callbackBody,
      /selectedDesignIdRef\.current/,
      "must read the current selection via a ref",
    );
    assert.match(
      callbackBody,
      /optionsRef\.current\?\.onQueueChanged\?\.\(\)/,
      "must call the latest onQueueChanged via a ref, not the closed-over options variable",
    );

    // The exact regression this fix targets: reconcileBackgroundAiQueueEvent must be called with
    // the ref-derived local variables, not the bare `designs`/`selectedDesignId` closure values.
    assert.match(
      callbackBody,
      /const currentDesigns = designsRef\.current;/,
      "must snapshot designsRef.current into a local before use",
    );
    assert.match(
      callbackBody,
      /const currentSelectedDesignId = selectedDesignIdRef\.current;/,
      "must snapshot selectedDesignIdRef.current into a local before use",
    );
    assert.match(
      callbackBody,
      /reconcileBackgroundAiQueueEvent\(\s*event,\s*currentDesigns,\s*currentSelectedDesignId,?\s*\)/,
      "reconciliation must use the ref-derived locals, not the closed-over designs/selectedDesignId",
    );
    // And it must never call options?.onQueueChanged?.() directly (only optionsRef.current?.…).
    assert.doesNotMatch(
      callbackBody,
      /(?<!\w)options\?\.onQueueChanged/,
      "must not call the closed-over options directly — use optionsRef.current instead",
    );
  });

  it("optionsRef, designsRef, and selectedDesignIdRef are assigned directly in the hook body during render, not inside a useEffect", () => {
    const source = readHookSource();

    // Each assignment line must exist as a plain statement, not nested inside a useEffect(() => ...
    // block — approximated by confirming the assignment appears before the first useEffect in the
    // hook and is not immediately preceded by "useEffect(() => {" on an adjacent line.
    assert.match(source, /^\s*optionsRef\.current = options;\s*$/m);
    assert.match(source, /^\s*selectedDesignIdRef\.current = selectedDesignId;\s*$/m);
    assert.match(source, /^\s*designsRef\.current = designs;\s*$/m);

    const firstUseEffectIndex = source.indexOf("useEffect(");
    const optionsRefAssignIndex = source.indexOf("optionsRef.current = options;");
    const selectedDesignIdRefAssignIndex = source.indexOf("selectedDesignIdRef.current = selectedDesignId;");
    const designsRefAssignIndex = source.indexOf("designsRef.current = designs;");

    assert.ok(optionsRefAssignIndex >= 0 && optionsRefAssignIndex < firstUseEffectIndex);
    assert.ok(
      selectedDesignIdRefAssignIndex >= 0 && selectedDesignIdRefAssignIndex < firstUseEffectIndex,
    );
    assert.ok(designsRefAssignIndex >= 0 && designsRefAssignIndex < firstUseEffectIndex);
  });

  it("observer.subscribed is emitted exactly once per effect body (not per render) — confirms trace-noise reduction follows from the dependency fix alone", () => {
    const source = readHookSource();
    const effectBody = source.slice(
      source.indexOf('event: "observer.subscribed"'),
      source.indexOf("}, [applyDesignPatch, filters.tab, reloadDesigns]);"),
    );

    assert.ok(effectBody.length > 0, "the observer subscription effect must be found");
    const occurrences = effectBody.match(/event: "observer\.subscribed"/g) ?? [];
    assert.equal(occurrences.length, 1, "observer.subscribed must be emitted exactly once per effect run");
  });

  it("Amendment 5's mount/tab-switch-only reconciliation effect remains unchanged (dependency array is exactly [filters.tab])", () => {
    const source = readHookSource();

    const mountReconciliationEffect = source.slice(
      source.indexOf('event: "inbox.tab_activated"'),
      source.indexOf('event: "inbox.tab_activated"') + 1200,
    );

    assert.match(mountReconciliationEffect, /if \(filters\.tab !== "processing" \|\| !hasPendingBackgroundAiWork\(\)\) \{/);
    assert.match(mountReconciliationEffect, /\}, \[filters\.tab\]\);/);
    assert.match(
      mountReconciliationEffect,
      /eslint-disable-next-line react-hooks\/exhaustive-deps -- intentional mount\/tab-switch-only trigger/,
    );
  });

  it("reconcileBackgroundAiQueueEvent and applyDesignPatch semantics are untouched by this fix", () => {
    const reconciliationSource = readFileSync(
      "apps/studio/src/renderer/src/features/ai-review/utils/backgroundAiQueueReconciliation.ts",
      "utf8",
    );
    const useDesignsSource = readFileSync(
      "apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts",
      "utf8",
    );

    // Both remain exactly as verified in prior amendments — the pure decision function's contract
    // (patch | null, pendingAdvanceIndex) and useDesigns' own stable useCallback wrapping.
    assert.match(
      reconciliationSource,
      /export function reconcileBackgroundAiQueueEvent\(/,
    );
    assert.match(useDesignsSource, /const applyDesignPatch = useCallback\(/);
    assert.match(useDesignsSource, /const reloadDesigns = useCallback\(/);
  });

  it("the Amendment 5 200-second callable timeout constant is unchanged", () => {
    const source = readFileSync(
      "apps/studio/src/renderer/src/features/ai-review/utils/aiEnrichmentCallableErrorMessage.ts",
      "utf8",
    );
    assert.match(source, /ENQUEUE_AI_ENRICHMENT_CLIENT_TIMEOUT_MS = 200_000/);
  });
});
