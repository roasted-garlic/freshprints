import type { Timestamp } from "firebase/firestore";

export type PrintRequestLifecycleEventType =
  | "request_created"
  | "added_to_show"
  | "removed_from_show"
  | "editing_started"
  | "moved_from_show"
  | "moved_to_show"
  | "did_not_print_requeued"
  | "released_for_requeue"
  | "production_started"
  | "allocation_printed"
  | "allocation_completed"
  | "request_completed"
  | "converted_to_internal"
  | "archived";

export type PrintRequestLifecycleEventSource =
  | "print_request"
  | "show_allocation"
  | "show_allocation_delete";

export type PrintRequestLifecycleEventDerivation = "forward";

/**
 * Immutable, server-authored evidence for business-significant Print Request activity.
 * This is deliberately separate from customerActivityEvents, which is identity/account audit.
 */
export interface PrintRequestLifecycleEvent {
  id: string;
  printRequestId: string;
  customerId?: string;
  type: PrintRequestLifecycleEventType;
  occurredAt: Timestamp;
  precedence: number;
  source: PrintRequestLifecycleEventSource;
  sourceId: string;
  sourceChangeId: string;
  derivation: PrintRequestLifecycleEventDerivation;
  upcomingShowId?: string;
  showTitleSnapshot?: string;
  showScheduledStartAt?: Timestamp | null;
  allocationId?: string;
  relatedAllocationId?: string;
  detail?: string;
}

export interface PrintRequestLifecycleMirror {
  lastLifecycleActivityAt?: Timestamp;
  lastLifecycleActivityEventId?: string;
  lastLifecycleActivityPrecedence?: number;
}
