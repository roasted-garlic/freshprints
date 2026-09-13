import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  chooseLatest,
  historicalCandidate,
  isAfter,
  resolveMirrorCandidate,
  type BackfillCandidate,
} from "./backfill-print-request-lifecycle-ordering-dev";

function timestamp(millis: number): { toMillis: () => number } {
  return { toMillis: () => millis };
}

function historical(millis: number, id: string, precedence = 20): BackfillCandidate {
  return { millis, id, precedence, source: "historical test", derivation: "historical" };
}

describe("Print Request lifecycle mirror backfill ordering", () => {
  it("preserves an existing trusted forward mirror on an equal synthetic tie", () => {
    const current = {
      lastLifecycleActivityAt: timestamp(1_000),
      lastLifecycleActivityEventId: "020_forward-event",
      lastLifecycleActivityPrecedence: 20,
    };
    assert.equal(isAfter(historical(1_000, "request:allocation:a:created"), current, true), false);
  });

  it("does not regress a newer forward mirror to an older fallback", () => {
    const current = {
      lastLifecycleActivityAt: timestamp(2_000),
      lastLifecycleActivityEventId: "020_forward-event",
      lastLifecycleActivityPrecedence: 20,
    };
    assert.equal(isAfter(historical(1_000, "request:created"), current, true), false);
  });

  it("proposes a deterministic mirror when no current mirror exists", () => {
    const candidate = historicalCandidate(
      "request",
      { createdAt: timestamp(100) },
      [{ id: "allocation-b", createdAt: timestamp(500) }, { id: "allocation-a", createdAt: timestamp(500) }],
    );
    assert.equal(candidate?.id, "request:allocation:allocation-b:created");
    assert.equal(candidate?.millis, 500);
  });

  it("uses reviewed precedence and a stable ID for historical equal-time ties", () => {
    const candidate = historicalCandidate(
      "request",
      { createdAt: timestamp(1_000), convertedAt: timestamp(2_000) },
      [
        { id: "allocation-a", completedAt: timestamp(2_000) },
        { id: "allocation-b", completedAt: timestamp(2_000) },
      ],
    );
    assert.equal(candidate?.id, "request:converted");
    assert.equal(candidate?.precedence, 90);

    const stable = chooseLatest([
      historical(2_000, "request:allocation-b:completed", 70),
      historical(2_000, "request:allocation-a:completed", 70),
    ]);
    assert.equal(stable?.id, "request:allocation-b:completed");
  });

  it("advances monotonically for a genuinely newer supported candidate", () => {
    const current = {
      lastLifecycleActivityAt: timestamp(1_000),
      lastLifecycleActivityEventId: "020_forward-event",
      lastLifecycleActivityPrecedence: 20,
    };
    assert.equal(isAfter(historical(2_000, "request:converted", 90), current, true), true);
  });

  it("resolves forward evidence ahead of an equal historical fallback and is idempotent", () => {
    const input = {
      requestId: "request",
      requestData: { createdAt: timestamp(100) },
      allocations: [{ id: "allocation-a", createdAt: timestamp(500) }],
      forwardEvents: [
        {
          id: "020_forward-event",
          occurredAt: timestamp(500),
          precedence: 20,
          derivation: "forward" as const,
        },
      ],
    };
    const resolved = resolveMirrorCandidate(input);
    assert.equal(resolved.candidate?.id, "020_forward-event");
    const applied = {
      lastLifecycleActivityAt: timestamp(resolved.candidate!.millis),
      lastLifecycleActivityEventId: resolved.candidate!.id,
      lastLifecycleActivityPrecedence: resolved.candidate!.precedence,
    };
    assert.equal(isAfter(resolved.candidate!, applied, true), false);
  });
});
