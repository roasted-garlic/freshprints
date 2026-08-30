import type { PrintRequestListTab } from "@fresh-prints/shared/utils/printRequestListGrouping";
import type { PrintRequestStatus } from "@fresh-prints/shared/types/printRequest/printRequest.enums";
import type { PrintRequestClosureKind } from "@fresh-prints/shared/types/printRequest/printRequest.types";

export const PRINT_REQUEST_HISTORY_PAGE_SIZE = 15;
export const PRINT_REQUEST_DETAIL_EVENT_LIMIT = 25;
export const ACCOUNT_ACTIVITY_PAGE_SIZE = 10;
/** Bounded count for summary tile when a full lifetime scan is unnecessary. */
export const ACCOUNT_ACTIVITY_COUNT_CAP = 100;

export interface PrintRequestHistoryShowContext {
  showId: string;
  showTitle: string;
  scheduledStartAtMillis: number | null;
  scheduledLabel: string;
  queuedToShowAtMillis: number | null;
  queuedToShowLabel: string | null;
  showDeepLinkPath: string;
}

export interface PrintRequestHistoryConversionSummary {
  closureKind: PrintRequestClosureKind;
  internalRequestId: string;
  internalRequestName?: string;
  convertedAtMillis?: number;
}

export interface PrintRequestHistoryConvertedFromSummary {
  customerRequestId: string;
  customerRequestName?: string;
}

export interface PrintRequestHistoryMergedAttribution {
  customerId: string;
  usernameAtCreation?: string;
  label: string;
}

export interface PrintRequestHistoryCardSummary {
  printRequestId: string;
  name: string;
  status: PrintRequestStatus;
  originLabel: string;
  lifecycleLabel: string;
  queueTab?: PrintRequestListTab;
  createdAtMillis: number;
  updatedAtMillis: number;
  itemCount: number;
  showContext?: PrintRequestHistoryShowContext;
  /** Canceled source show when the request was requeued after Did Not Print. */
  missedShowContext?: PrintRequestHistoryShowContext;
  conversion?: PrintRequestHistoryConversionSummary;
  convertedFrom?: PrintRequestHistoryConvertedFromSummary;
  deepLinkPath: string;
  internalDeepLinkPath?: string;
  customerDeepLinkPath?: string;
  /** Archived customer request path when the card represents a converted CR. */
  archivedCustomerDeepLinkPath?: string;
  /** Details-only merge attribution — not rendered on compact cards. */
  mergedSourceAttribution?: PrintRequestHistoryMergedAttribution;
}

export type PrintRequestHistoryDetailDerivation = "persisted" | "reconstructed";

export interface PrintRequestHistoryDetailEvent {
  id: string;
  label: string;
  detail?: string;
  occurredAtMillis: number;
  derivation: PrintRequestHistoryDetailDerivation;
}

export interface PrintRequestHistoryDetail {
  summary: PrintRequestHistoryCardSummary;
  events: PrintRequestHistoryDetailEvent[];
  hasMoreEvents: boolean;
  totalEventCount: number;
}

export interface PrintRequestHistoryPage {
  summaries: PrintRequestHistoryCardSummary[];
  totalCount: number;
  visibleCount: number;
  hasMore: boolean;
}

import type { AuditTrailEntry } from "./auditTrail.types";

export interface CustomerAccountActivityPage {
  entries: AuditTrailEntry[];
  totalLoaded: number;
  hasMore: boolean;
  boundedTotalCount: number;
  countIsBounded: boolean;
}
