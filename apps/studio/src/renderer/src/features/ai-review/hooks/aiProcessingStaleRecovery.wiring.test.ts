import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("stale processing recovery wiring", () => {
  it("retryStaleProcessingSelected uses enqueueForProcessing and handles already_processing", () => {
    const source = readFileSync(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts",
      "utf8",
    );
    const staleRetryBlock = source.slice(
      source.indexOf("const retryStaleProcessingSelected = useCallback("),
      source.indexOf("const ignoreSuggestedTag = useCallback("),
    );

    assert.match(staleRetryBlock, /clearTerminalAiProcessingLedgerEntry\(selectedDesign\.id\)/);
    assert.match(staleRetryBlock, /aiEnrichmentEnqueueService\.enqueueForProcessing\(/);
    assert.match(staleRetryBlock, /result\.reason === "already_processing"/);
    assert.match(staleRetryBlock, /buildDesignPatchFromEnqueueResult\(result\)/);
    assert.doesNotMatch(staleRetryBlock, /retryFailedProcessing/);
  });

  it("functions config re-exports shared stale threshold", () => {
    const source = readFileSync("functions/src/ai/aiEnrichmentConfig.ts", "utf8");
    assert.match(source, /SHARED_AI_ENRICHMENT_STALE_STAGE_MS/);
    assert.match(source, /from "\.\.\/\.\.\/\.\.\/packages\/shared\/src\/constants\/aiEnrichment\.constants"/);
  });

  it("AiReviewWorkspace exposes distinct stale Retry Processing action", () => {
    const source = readFileSync(
      "apps/studio/src/renderer/src/features/ai-review/components/AiReviewWorkspace.tsx",
      "utf8",
    );
    assert.match(source, /canRetryStaleProcessing/);
    assert.match(source, /onRetryStaleProcessing/);
    assert.match(source, /Retry Processing/);
    assert.match(source, /Retry AI Processing/);
  });
});
