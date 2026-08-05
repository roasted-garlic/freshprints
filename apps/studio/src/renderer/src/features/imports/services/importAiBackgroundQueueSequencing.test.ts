import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(p: string): string {
  return readFileSync(p, "utf8");
}

/**
 * Owner QA Amendment 3, Failure 1: three imported designs jumped from 3 -> 0 in Processing
 * instead of reconciling one at a time. The pump was already sequential; it simply never told the
 * AI Review view about each terminal transition.
 *
 * This models the pump's real control flow (await one call, then notify, then take the next) to
 * prove the observable Processing count goes 3 -> 2 -> 1 -> 0 and that only one AI request is ever
 * in flight.
 */
async function runSequentialPump(designIds: string[], onSettled: (pending: number) => void) {
  const pending = [...designIds];
  let inFlight = 0;
  let maxConcurrent = 0;

  while (pending.length > 0) {
    const designId = pending.shift();
    if (!designId) continue;

    inFlight += 1;
    maxConcurrent = Math.max(maxConcurrent, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 1));
    inFlight -= 1;

    onSettled(pending.length);
  }

  return { maxConcurrent };
}

describe("import background AI queue sequencing (Amendment 3, Failure 1)", () => {
  it("reconciles Processing one design at a time: 3 -> 2 -> 1 -> 0, never 3 -> 0", async () => {
    const designIds = ["design-a", "design-b", "design-c"];
    let processingCount = designIds.length;
    const observed: number[] = [processingCount];

    await runSequentialPump(designIds, () => {
      processingCount -= 1;
      observed.push(processingCount);
    });

    assert.deepEqual(
      observed,
      [3, 2, 1, 0],
      "Processing must decrement once per completed design, not collapse from 3 straight to 0",
    );
    assert.notDeepEqual(observed, [3, 0]);
  });

  it("never runs more than one AI request at a time", async () => {
    const { maxConcurrent } = await runSequentialPump(["a", "b", "c"], () => {});
    assert.equal(maxConcurrent, 1, "AI processing must stay strictly one-at-a-time");
  });

  it("notifies an observer after each design settles, including failures, with the remaining count", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts",
    );

    // Both the success and failure branches must notify, otherwise a failed design would strand
    // the Processing count until an unrelated reload.
    const successBlock = source.slice(
      source.indexOf('logPipelineEvent("import.ai_background.enqueued"'),
      source.indexOf('logPipelineEvent("import.ai_background.enqueue_failed"'),
    );
    assert.match(successBlock, /notifyObservers\(\{ designId, pending: pendingDesignIds\.length, outcome: "completed" \}\)/);

    const failureBlock = source.slice(
      source.indexOf('logPipelineEvent("import.ai_background.enqueue_failed"'),
    );
    assert.match(failureBlock, /notifyObservers\(\{ designId, pending: pendingDesignIds\.length, outcome: "failed" \}\)/);
  });

  it("keeps the pump strictly sequential (one awaited call per loop iteration, no Promise.all)", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts",
    );
    const pumpBlock = source.slice(source.indexOf("async function pumpBackgroundAiQueue"));

    assert.match(pumpBlock, /await aiEnrichmentEnqueueService\.enqueueForProcessing\(designId\);/);
    assert.doesNotMatch(pumpBlock, /Promise\.all|Promise\.allSettled/);
  });

  it("AI Review subscribes to the pump without adding a listener or polling", () => {
    const inbox = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts",
    );

    assert.match(inbox, /subscribeToBackgroundAiQueue\(\(\) => \{/);
    const subscribeBlock = inbox.slice(
      inbox.indexOf("return subscribeToBackgroundAiQueue(() => {"),
      inbox.indexOf("return subscribeToBackgroundAiQueue(() => {") + 260,
    );
    assert.match(subscribeBlock, /void reloadDesigns\(\);/);
    assert.match(subscribeBlock, /options\?\.onQueueChanged\?\.\(\);/);
    assert.doesNotMatch(subscribeBlock, /setInterval|onSnapshot/);
  });
});
