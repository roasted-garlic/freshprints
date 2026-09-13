import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Timestamp } from "firebase-admin/firestore";

import {
  PRECEDENCE,
  areFirestoreValuesEqual,
  buildEventId,
  compareEventToMirror,
  hasLifecycleInputChange,
  resolveRequestEvents,
} from "./onPrintRequestLifecycleRequestWritten";

describe("Print Request lifecycle request trigger", () => {
  it("emits deterministic creation, editing, completion, conversion, and archive evidence", () => {
    const created = resolveRequestEvents({
      printRequestId: "pr-1",
      sourceChangeId: "change-1",
      after: {
        customerId: "customer-1",
        status: "draft",
        createdAt: Timestamp.fromMillis(100),
      },
      eventTime: "2026-09-09T12:00:00.000Z",
    });
    assert.deepEqual(created.map((event) => event.type), ["request_created"]);

    const transitioned = resolveRequestEvents({
      printRequestId: "pr-1",
      sourceChangeId: "change-2",
      before: { status: "active", convertedAt: undefined },
      after: {
        status: "editing",
        convertedAt: Timestamp.fromMillis(400),
        updatedAt: Timestamp.fromMillis(300),
      },
      eventTime: "2026-09-09T12:00:00.000Z",
    });
    assert.deepEqual(transitioned.map((event) => event.type), [
      "editing_started",
      "converted_to_internal",
    ]);
    assert.equal(transitioned[0]?.precedence, PRECEDENCE.editing_started);
    assert.equal(transitioned[1]?.occurredAt.toMillis(), 400);
  });

  it("is idempotent and only advances the mirror for later lifecycle evidence", () => {
    const eventId = buildEventId({
      printRequestId: "pr-1",
      type: "request_created",
      sourceId: "pr-1",
      sourceChangeId: "change-1:created",
    });
    assert.equal(eventId, buildEventId({
      printRequestId: "pr-1",
      type: "request_created",
      sourceId: "pr-1",
      sourceChangeId: "change-1:created",
    }));

    const event = {
      id: "050_move",
      printRequestId: "pr-1",
      type: "moved_to_show" as const,
      occurredAt: Timestamp.fromMillis(500),
      precedence: 50,
      source: "show_allocation" as const,
      sourceId: "allocation-1",
      sourceChangeId: "move-1",
      derivation: "forward" as const,
    };
    assert.ok(compareEventToMirror(event, {
      lastLifecycleActivityAt: Timestamp.fromMillis(400),
      lastLifecycleActivityPrecedence: 80,
      lastLifecycleActivityEventId: "080_complete",
    }) > 0);
    assert.ok(compareEventToMirror(event, {
      lastLifecycleActivityAt: Timestamp.fromMillis(600),
      lastLifecycleActivityPrecedence: 50,
      lastLifecycleActivityEventId: "050_later",
    }) < 0);
  });

  it("treats equal Firestore values as unchanged and real Timestamp changes as significant", () => {
    const sameTimestampA = new Timestamp(10, 5);
    const sameTimestampB = new Timestamp(10, 5);
    const differentTimestamp = new Timestamp(10, 6);
    assert.equal(areFirestoreValuesEqual(sameTimestampA, sameTimestampB), true);
    assert.equal(areFirestoreValuesEqual(sameTimestampA, differentTimestamp), false);
    assert.equal(
      areFirestoreValuesEqual({ nested: { at: sameTimestampA } }, { nested: { at: sameTimestampB } }),
      true,
    );
    assert.equal(
      hasLifecycleInputChange({ convertedAt: sameTimestampA }, { convertedAt: sameTimestampB }),
      false,
    );
    assert.equal(
      hasLifecycleInputChange({ convertedAt: sameTimestampA }, { convertedAt: differentTimestamp }),
      true,
    );
  });

  it("ignores mirror-only writes and does not recursively emit lifecycle activity", () => {
    const convertedAtBefore = new Timestamp(20, 7);
    const convertedAtAfter = new Timestamp(20, 7);
    const before = {
      customerId: "customer-1",
      status: "active",
      convertedAt: convertedAtBefore,
      lastLifecycleActivityAt: Timestamp.fromMillis(100),
      lastLifecycleActivityEventId: "020_previous",
      lastLifecycleActivityPrecedence: 20,
    };
    const after = {
      ...before,
      convertedAt: convertedAtAfter,
      lastLifecycleActivityAt: Timestamp.fromMillis(200),
      lastLifecycleActivityEventId: "020_next",
      lastLifecycleActivityPrecedence: 20,
    };
    assert.equal(hasLifecycleInputChange(before, after), false);
    assert.deepEqual(
      resolveRequestEvents({
        printRequestId: "pr-1",
        sourceChangeId: "mirror-only",
        before,
        after,
        eventTime: "2026-09-09T12:00:00.000Z",
      }),
      [],
    );
  });

  it("still emits one deterministic event for a legitimate conversion", () => {
    const eventInput = {
      printRequestId: "pr-1",
      sourceChangeId: "conversion-1",
      before: { status: "active", convertedAt: undefined },
      after: {
        status: "active",
        convertedAt: new Timestamp(30, 1),
        updatedAt: new Timestamp(30, 2),
      },
      eventTime: "2026-09-09T12:00:00.000Z",
    };
    const first = resolveRequestEvents(eventInput);
    const second = resolveRequestEvents(eventInput);
    assert.deepEqual(first.map((event) => event.type), ["converted_to_internal"]);
    assert.equal(first.length, 1);
    assert.equal(first[0]?.id, second[0]?.id);
  });

  it("detects deletion of a lifecycle-significant field", () => {
    assert.equal(
      hasLifecycleInputChange({ status: "active", convertedAt: Timestamp.fromMillis(10) }, { status: "active" }),
      true,
    );
  });
});
