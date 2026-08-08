import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { scrollAiReviewPageContentToTop } from "./aiReviewWorkspaceScroll";

describe("scrollAiReviewPageContentToTop", () => {
  it("scrolls the preferred .page-content-area--ai-review ancestor to top", () => {
    const container = {
      className: "page-content-area page-content-area--ai-review",
      scrollTop: 480,
      scrollHeight: 2000,
      clientHeight: 800,
      closest(selector: string) {
        return selector === ".page-content-area--ai-review" ? this : null;
      },
      parentElement: null,
    };

    const child = {
      closest(selector: string) {
        return container.closest(selector);
      },
      parentElement: container,
    };

    const previousQuery = globalThis.document?.querySelector;
    // jsdom may be absent — stub minimal document for fallback path.
    (globalThis as { document?: { querySelector: (s: string) => unknown } }).document = {
      querySelector: () => null,
    };

    const result = scrollAiReviewPageContentToTop(child as unknown as HTMLElement);

    assert.equal(result.scrolled, true);
    assert.equal(result.containerClassName, "page-content-area--ai-review");
    assert.equal(container.scrollTop, 0);

    if (previousQuery) {
      (globalThis as { document: { querySelector: typeof previousQuery } }).document = {
        querySelector: previousQuery,
      };
    }
  });
});

describe("Amendment 9 P0 scroll correction wiring", () => {
  const inbox = readFileSync(
    "apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts",
    "utf8",
  );
  const workspace = readFileSync(
    "apps/studio/src/renderer/src/features/ai-review/components/AiReviewWorkspace.tsx",
    "utf8",
  );
  const page = readFileSync(
    "apps/studio/src/renderer/src/features/ai-review/pages/AiReviewPage.tsx",
    "utf8",
  );

  it("increments a review-scroll nonce only from successful manual inbox actions", () => {
    assert.match(inbox, /reviewScrollNonce/);
    assert.match(inbox, /setReviewScrollNonce/);
    const runStart = inbox.indexOf("const runInboxAction = useCallback(");
    const runEnd = inbox.indexOf("const runRejectedTabNavigationAction = useCallback(", runStart);
    const block = inbox.slice(runStart, runEnd);
    const tryStart = block.indexOf("try {");
    const catchStart = block.indexOf("} catch (inboxError)");
    const success = block.slice(tryStart, catchStart);
    assert.match(success, /setReviewScrollNonce/);
    assert.doesNotMatch(block.slice(catchStart), /setReviewScrollNonce/);
  });

  it("does not scroll from Processing patch paths", () => {
    const observerStart = inbox.indexOf("return subscribeToBackgroundAiQueue((event) => {");
    const observerEnd = inbox.indexOf("}, [applyDesignPatch, filters.tab, reloadDesigns]);", observerStart);
    const observer = inbox.slice(observerStart, observerEnd);
    assert.doesNotMatch(observer, /setReviewScrollNonce|scrollAiReviewPageContentToTop/);
  });

  it("workspace scrolls on nonce change using the page-content scroll helper", () => {
    assert.match(workspace, /scrollAiReviewPageContentToTop/);
    assert.match(workspace, /reviewScrollNonce/);
    assert.match(workspace, /useLayoutEffect/);
    assert.doesNotMatch(workspace, /window\.scrollTo/);
    assert.doesNotMatch(workspace, /setInterval|setTimeout/);
  });

  it("page wires reviewScrollNonce into the workspace", () => {
    assert.match(page, /reviewScrollNonce=\{inbox\.reviewScrollNonce\}/);
  });

  it("P0 happy path still avoids reloadDesigns / onQueueChanged", () => {
    const runStart = inbox.indexOf("const runInboxAction = useCallback(");
    const success = inbox.slice(runStart, inbox.indexOf("} catch (inboxError)", runStart));
    assert.doesNotMatch(success, /reloadDesigns\(/);
    assert.doesNotMatch(success, /onQueueChanged\?\.\(\)/);
  });
});
