import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { withCustomerUploadFinalizeWatchdog } from "./customerUploadFinalizeWatchdog";

function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

describe("withCustomerUploadFinalizeWatchdog", () => {
  it("resolves with the work result when work finishes before the deadline", async () => {
    let timedOut = false;
    const result = await withCustomerUploadFinalizeWatchdog(
      delay(10, "done"),
      1000,
      () => {
        timedOut = true;
      },
      "timed out",
    );
    assert.equal(result, "done");
    assert.equal(timedOut, false);
  });

  it("rejects and calls onTimeout when the deadline elapses first", async () => {
    let timedOut = false;
    await assert.rejects(
      () =>
        withCustomerUploadFinalizeWatchdog(
          delay(1000, "too-late"),
          10,
          () => {
            timedOut = true;
          },
          "watchdog tripped",
        ),
      /watchdog tripped/,
    );
    assert.equal(timedOut, true);
  });

  it("awaits an async onTimeout before rejecting", async () => {
    const events: string[] = [];
    await assert.rejects(
      () =>
        withCustomerUploadFinalizeWatchdog(
          delay(1000, "too-late"),
          10,
          async () => {
            await delay(5, undefined);
            events.push("onTimeout-completed");
          },
          "watchdog tripped",
        ),
      /watchdog tripped/,
    );
    assert.deepEqual(events, ["onTimeout-completed"]);
  });

  it("propagates a rejection from work unchanged and does not fire onTimeout", async () => {
    let timedOut = false;
    const workError = new Error("boom");
    await assert.rejects(
      () =>
        withCustomerUploadFinalizeWatchdog(
          Promise.reject(workError),
          1000,
          () => {
            timedOut = true;
          },
          "watchdog tripped",
        ),
      workError,
    );
    assert.equal(timedOut, false);
  });

  it("does not fire onTimeout after work already settled (no stray late timer)", async () => {
    let timedOutCount = 0;
    const result = await withCustomerUploadFinalizeWatchdog(
      delay(5, "done"),
      15,
      () => {
        timedOutCount += 1;
      },
      "watchdog tripped",
    );
    assert.equal(result, "done");
    await delay(30, undefined);
    assert.equal(timedOutCount, 0);
  });
});
