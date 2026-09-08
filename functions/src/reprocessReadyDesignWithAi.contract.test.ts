/**
 * Contract: owner Ready reprocess callable export + auth + demotion preserves.
 * Run from repo root: npx tsx --test functions/src/reprocessReadyDesignWithAi.contract.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(rel: string): string {
  return readFileSync(rel, "utf8");
}

describe("reprocessReadyDesignWithAi contracts", () => {
  it("exports callable from functions index", () => {
    assert.match(read("functions/src/index.ts"), /reprocessReadyDesignWithAi/);
  });

  it("enforces owner-only auth", () => {
    const src = read("functions/src/reprocessReadyDesignWithAi.ts");
    assert.match(src, /role !== "owner"/);
    assert.match(src, /Only the active owner/);
  });

  it("requires ready + approved eligibility", () => {
    const core = read("functions/src/ai/reprocessReadyDesignWithAiCore.ts");
    assert.match(core, /status !== "ready"/);
    assert.match(core, /aiReviewStatus !== "approved"/);
  });

  it("does not delete smartProfile on demotion", () => {
    const core = read("functions/src/ai/reprocessReadyDesignWithAiCore.ts");
    assert.doesNotMatch(core, /smartProfile:\s*FieldValue\.delete/);
    assert.match(core, /"smartProfile"/);
  });

  it("retains readyAt / title / description / categoryId (not in demotion write)", () => {
    const core = read("functions/src/ai/reprocessReadyDesignWithAiCore.ts");
    for (const key of ["title", "description", "categoryId", "readyAt"]) {
      assert.match(core, new RegExp(`"${key}"`));
      assert.doesNotMatch(
        core,
        new RegExp(`${key}:\\s*FieldValue`),
        `${key} must not be rewritten on demotion`,
      );
    }
  });

  it("runs queue enrichment pipeline after demotion when autoStart is on", () => {
    const src = read("functions/src/reprocessReadyDesignWithAi.ts");
    assert.match(src, /runAiEnrichmentPipeline/);
    assert.match(src, /mode:\s*"queue"/);
    assert.match(src, /if \(!autoStart\)/);
    assert.match(src, /autoStarted: false/);
  });

  it("accepts optional autoStart and defaults missing to true", () => {
    const src = read("functions/src/reprocessReadyDesignWithAi.ts");
    assert.match(src, /autoStart/);
    assert.match(src, /typeof \(data as \{ autoStart\?: unknown \}\)\.autoStart === "boolean"/);
  });

  it("demotion-only path deletes stage when autoStart is false", () => {
    const core = read("functions/src/ai/reprocessReadyDesignWithAiCore.ts");
    assert.match(core, /autoStart !== false/);
    assert.match(core, /autoStart \? "queued" : FieldValue\.delete\(\)/);
  });

  it("queue write path preserves staff when prior smartProfile exists", () => {
    const pipeline = read("functions/src/ai/aiEnrichmentPipeline.ts");
    assert.match(pipeline, /mode === "ready_backfill" \|\| priorProfile/);
    assert.match(pipeline, /mergeReadyBackfillSmartProfile/);
  });
});
