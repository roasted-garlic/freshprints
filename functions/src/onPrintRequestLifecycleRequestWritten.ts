import { createHash } from "node:crypto";

import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

import type {
  PrintRequestLifecycleEvent,
  PrintRequestLifecycleEventType,
} from "../../packages/shared/src/types/printRequest/printRequestLifecycle.types";

import { adminDb } from "./lib/admin";
import { compareLifecycleTupleToMirror } from "./printRequestLifecycleMirror";

const EVENT_COLLECTION = "printRequestLifecycleEvents";
const MIRROR_FIELDS = new Set([
  "lastLifecycleActivityAt",
  "lastLifecycleActivityEventId",
  "lastLifecycleActivityPrecedence",
]);

export const PRECEDENCE: Record<PrintRequestLifecycleEventType, number> = {
  request_created: 10,
  added_to_show: 20,
  removed_from_show: 30,
  moved_from_show: 30,
  did_not_print_requeued: 50,
  editing_started: 40,
  moved_to_show: 50,
  released_for_requeue: 50,
  production_started: 60,
  allocation_printed: 70,
  allocation_completed: 70,
  request_completed: 80,
  converted_to_internal: 90,
  archived: 90,
};

export function asLifecycleTimestamp(value: unknown): Timestamp | undefined {
  if (value instanceof Timestamp) {
    return value;
  }
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return Timestamp.fromDate((value as { toDate: () => Date }).toDate());
  }
  return undefined;
}

function eventTimestamp(value: unknown, fallback: string): Timestamp {
  return asLifecycleTimestamp(value) ?? Timestamp.fromDate(new Date(fallback));
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Firestore snapshots can materialize equal structured values as different object instances.
 * Prefer each Firestore value's semantic isEqual implementation, then recurse only through
 * ordinary records/arrays so business fields remain value-compared without a broad deep-diff
 * dependency or JSON serialization.
 */
export function areFirestoreValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (left === null || right === null || left === undefined || right === undefined) {
    return false;
  }
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() === right.getTime();
  }
  if (left instanceof Uint8Array && right instanceof Uint8Array) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  const leftIsEqual = (left as { isEqual?: unknown }).isEqual;
  if (typeof leftIsEqual === "function") {
    try {
      return Boolean((leftIsEqual as (value: unknown) => boolean).call(left, right));
    } catch {
      return false;
    }
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => areFirestoreValuesEqual(value, right[index]))
    );
  }

  if (isPlainRecord(left) || isPlainRecord(right)) {
    if (!isPlainRecord(left) || !isPlainRecord(right)) {
      return false;
    }
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) => Object.prototype.hasOwnProperty.call(right, key) &&
          areFirestoreValuesEqual(left[key], right[key]),
      )
    );
  }

  return false;
}

function changed(before: DocumentData | undefined, after: DocumentData, field: string): boolean {
  return !areFirestoreValuesEqual(before?.[field], after[field]);
}

export function hasLifecycleInputChange(before: DocumentData | undefined, after: DocumentData): boolean {
  if (!before) {
    return true;
  }
  const fields = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...fields].some(
    (field) => !MIRROR_FIELDS.has(field) && !areFirestoreValuesEqual(before[field], after[field]),
  );
}

export function buildEventId(input: {
  printRequestId: string;
  type: PrintRequestLifecycleEventType;
  sourceId: string;
  sourceChangeId: string;
}): string {
  const digest = createHash("sha256")
    .update(
      input.printRequestId +
        "\0" +
        input.type +
        "\0" +
        input.sourceId +
        "\0" +
        input.sourceChangeId,
    )
    .digest("hex")
    .slice(0, 40);
  return String(PRECEDENCE[input.type]).padStart(3, "0") + "_" + digest;
}

function buildEvent(input: {
  printRequestId: string;
  customerId?: string;
  type: PrintRequestLifecycleEventType;
  occurredAt: Timestamp;
  sourceId: string;
  sourceChangeId: string;
  detail?: string;
}): PrintRequestLifecycleEvent {
  return {
    id: buildEventId(input),
    printRequestId: input.printRequestId,
    ...(input.customerId ? { customerId: input.customerId } : {}),
    type: input.type,
    occurredAt: input.occurredAt as unknown as PrintRequestLifecycleEvent["occurredAt"],
    precedence: PRECEDENCE[input.type],
    source: "print_request",
    sourceId: input.sourceId,
    sourceChangeId: input.sourceChangeId,
    derivation: "forward",
    ...(input.detail ? { detail: input.detail } : {}),
  };
}

export function resolveRequestEvents(input: {
  printRequestId: string;
  sourceChangeId: string;
  before?: DocumentData;
  after: DocumentData;
  eventTime: string;
}): PrintRequestLifecycleEvent[] {
  const { printRequestId, sourceChangeId, before, after, eventTime } = input;
  const customerId = typeof after.customerId === "string" ? after.customerId.trim() : undefined;
  const events: PrintRequestLifecycleEvent[] = [];

  if (!before) {
    events.push(
      buildEvent({
        printRequestId,
        customerId,
        type: "request_created",
        occurredAt: eventTimestamp(after.createdAt, eventTime),
        sourceId: printRequestId,
        sourceChangeId: sourceChangeId + ":created",
      }),
    );
  }

  if (before && changed(before, after, "status")) {
    const status = typeof after.status === "string" ? after.status : "";
    const type: PrintRequestLifecycleEventType | undefined =
      status === "editing"
        ? "editing_started"
        : status === "completed"
          ? "request_completed"
          : status === "archived"
            ? "archived"
            : undefined;
    if (type) {
      events.push(
        buildEvent({
          printRequestId,
          customerId,
          type,
          occurredAt: eventTimestamp(after.updatedAt, eventTime),
          sourceId: printRequestId,
          sourceChangeId: sourceChangeId + ":status:" + status,
        }),
      );
    }
  }

  if (changed(before, after, "convertedAt") && after.convertedAt) {
    events.push(
      buildEvent({
        printRequestId,
        customerId,
        type: "converted_to_internal",
        occurredAt: eventTimestamp(after.convertedAt, eventTime),
        sourceId: printRequestId,
        sourceChangeId: sourceChangeId + ":converted",
      }),
    );
  }

  if (changed(before, after, "needsStaffRequeueAt") && after.needsStaffRequeueAt) {
    events.push(
      buildEvent({
        printRequestId,
        customerId,
        type: "released_for_requeue",
        occurredAt: eventTimestamp(after.needsStaffRequeueAt, eventTime),
        sourceId: printRequestId,
        sourceChangeId: sourceChangeId + ":released-for-requeue",
        detail:
          typeof after.needsStaffRequeueSourceShowTitleSnapshot === "string"
            ? after.needsStaffRequeueSourceShowTitleSnapshot
            : undefined,
      }),
    );
  }

  return events;
}

export function compareEventToMirror(
  event: PrintRequestLifecycleEvent,
  current: DocumentData | undefined,
): number {
  return compareLifecycleTupleToMirror(
    {
      millis: event.occurredAt.toMillis(),
      precedence: event.precedence,
      id: event.id,
      derivation: "forward",
    },
    current,
  );
}

async function persistLifecycleEvents(
  printRequestId: string,
  events: readonly PrintRequestLifecycleEvent[],
): Promise<void> {
  if (events.length === 0) {
    return;
  }

  const requestRef = adminDb.collection("printRequests").doc(printRequestId);
  await adminDb.runTransaction(async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);
    if (!requestSnapshot.exists) {
      return;
    }

    const eventSnapshots = [];
    for (const event of events) {
      eventSnapshots.push(
        await transaction.get(adminDb.collection(EVENT_COLLECTION).doc(event.id)),
      );
    }

    let requestData = requestSnapshot.data() ?? {};
    let mirrorChanged = false;
    for (let index = 0; index < events.length; index += 1) {
      const event = events[index];
      const eventSnapshot = eventSnapshots[index];
      if (!eventSnapshot || eventSnapshot.exists) {
        continue;
      }
      transaction.create(adminDb.collection(EVENT_COLLECTION).doc(event.id), event);
      if (compareEventToMirror(event, requestData) > 0) {
        requestData = {
          ...requestData,
          lastLifecycleActivityAt: event.occurredAt,
          lastLifecycleActivityEventId: event.id,
          lastLifecycleActivityPrecedence: event.precedence,
        };
        mirrorChanged = true;
      }
    }

    if (mirrorChanged) {
      transaction.update(requestRef, {
        lastLifecycleActivityAt: requestData.lastLifecycleActivityAt,
        lastLifecycleActivityEventId: requestData.lastLifecycleActivityEventId,
        lastLifecycleActivityPrecedence: requestData.lastLifecycleActivityPrecedence,
      });
    }
  });
}

export const onPrintRequestLifecycleRequestWritten = onDocumentWritten(
  "printRequests/{printRequestId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!after || !hasLifecycleInputChange(before, after)) {
      return;
    }

    await persistLifecycleEvents(
      event.params.printRequestId,
      resolveRequestEvents({
        printRequestId: event.params.printRequestId,
        sourceChangeId: event.id,
        before,
        after,
        eventTime: event.time,
      }),
    );
  },
);
