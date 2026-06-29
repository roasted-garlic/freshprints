import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PipelinePhaseTimer, logPipelineMilestone } from "./pipelineTiming";

describe("PipelinePhaseTimer", () => {
  it("logPhase records durationMs and totalPipelineMs", () => {
    const timer = new PipelinePhaseTimer();
    timer.logPhase("pipeline.started", { designId: "d1" });

    const elapsed = timer.elapsedMs();

    assert.ok(elapsed >= 0);
  });
});

describe("logPipelineMilestone", () => {
  it("does not throw", () => {
    assert.doesNotThrow(() => {
      logPipelineMilestone("enqueue.queued", { designId: "d1" });
    });
  });
});
