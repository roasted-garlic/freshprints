import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeElapsedPrintMs, formatPrintElapsed, isShowPrintTimerPaused } from "./showPrintTimer";

describe("showPrintTimer", () => {
  it("computeElapsedPrintMs returns accumulated time when paused", () => {
    const elapsed = computeElapsedPrintMs({
      accumulatedPrintMs: 90_000,
      nowMs: 200_000,
    });

    assert.equal(elapsed, 90_000);
  });

  it("computeElapsedPrintMs adds the active running segment", () => {
    const elapsed = computeElapsedPrintMs({
      accumulatedPrintMs: 90_000,
      activePrintStartedAtMs: 150_000,
      nowMs: 165_000,
    });

    assert.equal(elapsed, 105_000);
  });

  it("formatPrintElapsed renders mm:ss and hh:mm:ss", () => {
    assert.equal(formatPrintElapsed(65_000), "1:05");
    assert.equal(formatPrintElapsed(3_665_000), "1:01:05");
  });

  it("isShowPrintTimerPaused is true only when printing is paused", () => {
    assert.equal(
      isShowPrintTimerPaused({
        productionStatus: "printing",
        printPausedAtMs: 1,
        activePrintStartedAtMs: undefined,
      }),
      true,
    );
    assert.equal(
      isShowPrintTimerPaused({
        productionStatus: "printing",
        activePrintStartedAtMs: 1,
      }),
      false,
    );
  });
});
