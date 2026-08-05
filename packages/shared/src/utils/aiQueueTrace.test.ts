import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it, beforeEach } from "node:test";

import {
  AI_QUEUE_TRACE_MAX_EVENTS,
  getAiQueueTraceSnapshot,
  isAiQueueTraceEnabled,
  resetAiQueueTrace,
  setAiQueueTraceEnabled,
  traceAiQueueEvent,
} from "./aiQueueTrace";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

beforeEach(() => {
  setAiQueueTraceEnabled(false);
  resetAiQueueTrace();
});

/**
 * Owner QA Amendment 6 instrumentation safety contract. These tests do not assert anything about
 * AI queue *behavior* — this pass deliberately added no behavioral fix. They assert only that the
 * diagnostic itself is safe: off by default, bounded, and free of sensitive fields.
 */
describe("aiQueueTrace is disabled unless explicitly enabled", () => {
  it("is disabled by default and records nothing", () => {
    assert.equal(isAiQueueTraceEnabled(), false);

    traceAiQueueEvent({ event: "pump.start", source: "backgroundQueue" });

    assert.equal(getAiQueueTraceSnapshot().eventCount, 0);
  });

  it("records only while enabled, and stops again once disabled", () => {
    setAiQueueTraceEnabled(true);
    traceAiQueueEvent({ event: "pump.start", source: "backgroundQueue" });
    assert.equal(getAiQueueTraceSnapshot().eventCount, 1);

    setAiQueueTraceEnabled(false);
    traceAiQueueEvent({ event: "pump.idle", source: "backgroundQueue" });
    assert.equal(getAiQueueTraceSnapshot().eventCount, 1, "no event may be recorded once disabled");
  });

  it("is gated to development builds against the dev project only (shared gate, not its own weaker check)", () => {
    const mountSource = read(
      "apps/studio/src/renderer/src/features/firebase-debug/components/FirebaseDebugPanelMount.tsx",
    );

    // The only place tracing is switched on must be the existing dev-build + dev-project gate.
    assert.match(mountSource, /setAiQueueTraceEnabled\(isEnabled\)/);
    assert.match(mountSource, /isFirebaseDebugPanelEnabledForStudio\(\)/);

    const gateSource = read("packages/shared/src/utils/firebaseDebugPanelGate.ts");
    assert.match(gateSource, /FIREBASE_DEBUG_PANEL_ALLOWED_PROJECT_IDS = \["fresh-prints-dev"\]/);
    assert.match(gateSource, /options\.isDevelopmentBuild && isFirebaseDebugPanelAllowedProjectId/);
  });
});

describe("aiQueueTrace storage is bounded", () => {
  it("never exceeds the maximum event count, discarding oldest first", () => {
    setAiQueueTraceEnabled(true);

    for (let index = 0; index < AI_QUEUE_TRACE_MAX_EVENTS + 250; index += 1) {
      traceAiQueueEvent({ event: "pump.advance", source: "backgroundQueue", designId: `d-${index}` });
    }

    const snapshot = getAiQueueTraceSnapshot();
    assert.equal(snapshot.eventCount, AI_QUEUE_TRACE_MAX_EVENTS);
    assert.equal(snapshot.events.length, AI_QUEUE_TRACE_MAX_EVENTS);
    // Oldest were dropped; the newest survived.
    assert.equal(snapshot.events[snapshot.events.length - 1]?.designId, `d-${AI_QUEUE_TRACE_MAX_EVENTS + 249}`);
    assert.notEqual(snapshot.events[0]?.designId, "d-0");
  });

  it("assigns a monotonic sequence number and a timestamp to every event", () => {
    setAiQueueTraceEnabled(true);

    traceAiQueueEvent({ event: "a", source: "inbox" });
    traceAiQueueEvent({ event: "b", source: "inbox" });
    traceAiQueueEvent({ event: "c", source: "inbox" });

    const { events } = getAiQueueTraceSnapshot();
    assert.deepEqual(events.map((event) => event.seq), [1, 2, 3]);
    for (const event of events) {
      assert.equal(typeof event.timestampMs, "number");
    }
  });
});

describe("Copy AI Queue Trace output excludes sensitive fields", () => {
  it("drops any field not on the allowlist, even if a caller passes one", () => {
    setAiQueueTraceEnabled(true);

    traceAiQueueEvent({
      event: "observer.received",
      source: "inbox",
      designId: "design-1",
      // Deliberately smuggled sensitive fields — must never survive into the snapshot.
      title: "Customer's Secret Shirt Design",
      description: "internal notes",
      thumbnailPath: "/thumbnails/design-1.webp",
      originalPath: "/originals/design-1.png",
      customerEmail: "someone@example.com",
      token: "abc123",
    } as Parameters<typeof traceAiQueueEvent>[0]);

    const serialized = JSON.stringify(getAiQueueTraceSnapshot());

    assert.match(serialized, /design-1/, "allowlisted design IDs are expected to survive");
    for (const forbidden of [
      "Customer's Secret Shirt Design",
      "internal notes",
      "/thumbnails/",
      "/originals/",
      "someone@example.com",
      "abc123",
      "title",
      "description",
      "thumbnailPath",
      "originalPath",
      "customerEmail",
      "token",
    ]) {
      assert.ok(
        !serialized.includes(forbidden),
        `sensitive value or field name "${forbidden}" must never appear in the copied trace`,
      );
    }
  });

  it("keeps design-ID arrays as plain string IDs only", () => {
    setAiQueueTraceEnabled(true);

    traceAiQueueEvent({
      event: "render.derived_state",
      source: "render",
      processingDesignIds: ["a", "b"],
      needsReviewDesignIds: ["c"],
    });

    const { events } = getAiQueueTraceSnapshot();
    assert.deepEqual(events[0]?.processingDesignIds, ["a", "b"]);
    assert.deepEqual(events[0]?.needsReviewDesignIds, ["c"]);
  });

  it("no instrumented call site passes a whole Design object or a raw error message", () => {
    const instrumented = [
      "apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts",
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts",
      "apps/studio/src/renderer/src/features/designs/hooks/useDesigns.ts",
    ];

    for (const path of instrumented) {
      const source = read(path);
      // A spread into the trace call would bypass the allowlist's intent at the call site.
      assert.doesNotMatch(
        source,
        /traceAiQueueEvent\(\{[^}]*\.\.\./s,
        `${path} must not spread an object into traceAiQueueEvent`,
      );
      // error.message can contain arbitrary text — only enum-like error codes are permitted.
      assert.doesNotMatch(
        source,
        /traceAiQueueEvent\(\{[^}]*error\.message/s,
        `${path} must not put a raw error message into the trace`,
      );
    }
  });
});

describe("tracing does not change queue behavior", () => {
  it("traceAiQueueEvent returns void and throws nothing when disabled or enabled", () => {
    assert.equal(traceAiQueueEvent({ event: "x", source: "inbox" }), undefined);
    setAiQueueTraceEnabled(true);
    assert.equal(traceAiQueueEvent({ event: "x", source: "inbox" }), undefined);
  });

  it("the background queue's control flow does not read any trace state", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts",
    );

    // The pump may WRITE trace events, but no branch/loop condition may depend on the trace.
    assert.doesNotMatch(source, /if\s*\([^)]*isAiQueueTraceEnabled/);
    assert.doesNotMatch(source, /while\s*\([^)]*(isAiQueueTraceEnabled|traceAiQueueEvent)/);
    // The diagnostic-only active-design pointer must not gate any control flow either.
    assert.doesNotMatch(source, /if\s*\([^)]*activeQueueDesignId/);
  });

  it("the pump still awaits exactly one enqueue call per iteration (sequencing unchanged by instrumentation)", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/imports/services/importAiBackgroundQueue.ts",
    );
    const pumpBlock = source.slice(source.indexOf("async function pumpBackgroundAiQueue("));

    assert.match(pumpBlock, /await aiEnrichmentEnqueueService\.enqueueForProcessing\(designId\)/);
    assert.doesNotMatch(pumpBlock, /Promise\.all|Promise\.allSettled/);
  });
});
