import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

import type {
  PrintRequestLifecycleEvent,
  PrintRequestLifecycleEventSource,
  PrintRequestLifecycleEventType,
} from "../../packages/shared/src/types/printRequest/printRequestLifecycle.types";

import { adminDb } from "./lib/admin";
import {
  PRECEDENCE,
  asLifecycleTimestamp,
  buildEventId,
  compareEventToMirror,
} from "./onPrintRequestLifecycleRequestWritten";

const EVENT_COLLECTION = "printRequestLifecycleEvents";

function eventTimestamp(value: unknown, fallback: string): Timestamp {
  return asLifecycleTimestamp(value) ?? Timestamp.fromDate(new Date(fallback));
}

function resolvePrintRequestId(
  before: DocumentData | undefined,
  after: DocumentData | undefined,
): string | undefined {
  const value = after?.printRequestId ?? before?.printRequestId;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function loadShowContext(showId: string): Promise<{
  title?: string;
  scheduledStartAt?: Timestamp;
}> {
  const snapshot = await adminDb.collection("upcomingShows").doc(showId).get();
  if (!snapshot.exists) {
    return {};
  }
  const data = snapshot.data() ?? {};
  return {
    title:
      typeof data.title === "string" && data.title.trim()
        ? data.title.trim()
        : typeof data.whatnotShowId === "string"
          ? data.whatnotShowId.trim()
          : undefined,
    scheduledStartAt: asLifecycleTimestamp(data.scheduledStartAt),
  };
}

function buildAllocationEvent(input: {
  printRequestId: string;
  customerId?: string;
  type: PrintRequestLifecycleEventType;
  source: PrintRequestLifecycleEventSource;
  sourceId: string;
  sourceChangeId: string;
  occurredAt: Timestamp;
  upcomingShowId?: string;
  showTitleSnapshot?: string;
  showScheduledStartAt?: Timestamp;
  allocationId: string;
  relatedAllocationId?: string;
  detail?: string;
}): PrintRequestLifecycleEvent {
  return {
    id: buildEventId(input),
    printRequestId: input.printRequestId,
    ...(input.customerId ? { customerId: input.customerId } : {}),
    type: input.type,
    occurredAt: input.occurredAt as unknown as PrintRequestLifecycleEvent["occurredAt"],
    precedence: PRECEDENCE[input.type],
    source: input.source,
    sourceId: input.sourceId,
    sourceChangeId: input.sourceChangeId,
    derivation: "forward",
    ...(input.upcomingShowId ? { upcomingShowId: input.upcomingShowId } : {}),
    ...(input.showTitleSnapshot ? { showTitleSnapshot: input.showTitleSnapshot } : {}),
    ...(input.showScheduledStartAt
      ? {
          showScheduledStartAt:
            input.showScheduledStartAt as unknown as PrintRequestLifecycleEvent["showScheduledStartAt"],
        }
      : {}),
    allocationId: input.allocationId,
    ...(input.relatedAllocationId ? { relatedAllocationId: input.relatedAllocationId } : {}),
    ...(input.detail ? { detail: input.detail } : {}),
  };
}

export function resolveAllocationTransition(input: {
  before?: DocumentData;
  after?: DocumentData;
  eventTime: string;
  allocationId: string;
  printRequestId: string;
  customerId?: string;
  showContext: { title?: string; scheduledStartAt?: Timestamp };
  sourceChangeId: string;
}): PrintRequestLifecycleEvent | undefined {
  const {
    before,
    after,
    eventTime,
    allocationId,
    printRequestId,
    customerId,
    showContext,
    sourceChangeId,
  } = input;
  const data = after ?? before;
  if (!data) {
    return undefined;
  }

  const showId = typeof data.upcomingShowId === "string" ? data.upcomingShowId.trim() : undefined;
  const previousStatus = typeof before?.status === "string" ? before.status : undefined;
  const status = typeof after?.status === "string" ? after.status : undefined;
  let type: PrintRequestLifecycleEventType | undefined;
  let occurredAtValue: unknown;
  let source: PrintRequestLifecycleEventSource = "show_allocation";
  let relatedAllocationId: string | undefined;
  let detail: string | undefined;

  if (!after) {
    if (previousStatus === "canceled") {
      return undefined;
    }
    type = "removed_from_show";
    source = "show_allocation_delete";
    occurredAtValue = eventTime;
    detail = "Allocation deletion observed by the server.";
  } else if (!before) {
    if (typeof data.requeuedFromAllocationId === "string" && data.requeuedFromAllocationId.trim()) {
      type = "did_not_print_requeued";
      relatedAllocationId = data.requeuedFromAllocationId.trim();
    } else if (typeof data.movedFromAllocationId === "string" && data.movedFromAllocationId.trim()) {
      type = "moved_to_show";
      relatedAllocationId = data.movedFromAllocationId.trim();
    } else {
      type = "added_to_show";
    }
    occurredAtValue = data.createdAt;
  } else if (previousStatus !== status && status === "canceled") {
    type = "removed_from_show";
    occurredAtValue = data.canceledAt ?? data.updatedAt;
  } else if (previousStatus !== status && status === "in_progress") {
    type = "production_started";
    occurredAtValue = data.updatedAt;
  } else if (previousStatus !== status && status === "printed") {
    type = "allocation_printed";
    occurredAtValue = data.printedAt ?? data.updatedAt;
  } else if (previousStatus !== status && status === "done") {
    type = "allocation_completed";
    occurredAtValue = data.completedAt ?? data.updatedAt;
  } else {
    return undefined;
  }

  return buildAllocationEvent({
    printRequestId,
    customerId,
    type,
    source,
    sourceId: allocationId,
    sourceChangeId: sourceChangeId + ":" + type,
    occurredAt: eventTimestamp(occurredAtValue, eventTime),
    upcomingShowId: showId,
    showTitleSnapshot: showContext.title,
    showScheduledStartAt: showContext.scheduledStartAt,
    allocationId,
    relatedAllocationId,
    detail,
  });
}

async function persistAllocationEvent(event: PrintRequestLifecycleEvent): Promise<void> {
  const requestRef = adminDb.collection("printRequests").doc(event.printRequestId);
  const eventRef = adminDb.collection(EVENT_COLLECTION).doc(event.id);
  await adminDb.runTransaction(async (transaction) => {
    const requestSnapshot = await transaction.get(requestRef);
    const eventSnapshot = await transaction.get(eventRef);
    if (!requestSnapshot.exists || eventSnapshot.exists) {
      return;
    }

    transaction.create(eventRef, event);
    if (compareEventToMirror(event, requestSnapshot.data()) > 0) {
      transaction.update(requestRef, {
        lastLifecycleActivityAt: event.occurredAt,
        lastLifecycleActivityEventId: event.id,
        lastLifecycleActivityPrecedence: event.precedence,
      });
    }
  });
}

export const onPrintRequestLifecycleAllocationWritten = onDocumentWritten(
  "showAllocations/{allocationId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    const printRequestId = resolvePrintRequestId(before, after);
    if (!printRequestId) {
      return;
    }

    const current = after ?? before;
    const showId = typeof current?.upcomingShowId === "string" ? current.upcomingShowId.trim() : "";
    const showContext = showId ? await loadShowContext(showId) : {};
    const lifecycleEvent = resolveAllocationTransition({
      before,
      after,
      eventTime: event.time,
      allocationId: event.params.allocationId,
      printRequestId,
      customerId:
        typeof current?.customerId === "string" ? current.customerId.trim() : undefined,
      showContext,
      sourceChangeId: event.id,
    });
    if (lifecycleEvent) {
      await persistAllocationEvent(lifecycleEvent);
    }
  },
);
