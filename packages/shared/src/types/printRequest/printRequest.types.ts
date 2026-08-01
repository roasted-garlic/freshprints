import type { Timestamp } from "firebase/firestore";

import type { PrintRequestItemStatus, PrintRequestStatus } from "./printRequest.enums";
import type { PrintRequestListTab } from "../../utils/printRequestListGrouping";

export type PrintRequestOrigin =
  | "studio_internal"
  | "studio_customer"
  | "portal_customer";

/**
 * Provenance of a print request line item.
 * Missing `sourceType` on legacy docs means `catalog_design`.
 */
export type PrintRequestItemSourceType = "catalog_design" | "customer_upload";

export interface PrintRequest {
  id: string;
  name: string;
  customerId?: string;
  isInternal: boolean;
  requestOrigin?: PrintRequestOrigin;
  status: PrintRequestStatus;
  itemCount: number;
  /**
   * Server-maintained mirror of `derivePrintRequestListTab`'s output, kept in sync by
   * `onPrintRequestQueueStatusInputsWritten` whenever this request's items or allocations change.
   * Exists so the Studio Print Requests list can filter/count exactly (`where(queueTab==X)` +
   * `getCountFromServer`) without scanning every request's items/allocations on every page load
   * (Wave C hydration remediation, 2026-07-25). Never authoritative for production/queue status
   * shown elsewhere — `derivePrintRequestListTab` over live data remains the source of truth;
   * this field is a read-optimization mirror, recomputed, never hand-edited.
   * Absent on pre-migration documents until the one-time backfill runs.
   */
  queueTab?: PrintRequestListTab;
  requestSequenceNumber?: number;
  customerUsernameSnapshot?: string;
  customerDisplayNameSnapshot?: string;
  internalBaseName?: string;
  nameFormatVersion?: "legacy-v1" | "cr-ir-v1";
  notes?: string;
  /**
   * Binding public-bidding acknowledgment captured when the customer queued this
   * request to a show via Portal (`queuePortalPrintRequestToShow`).
   */
  showQueueBiddingAcknowledgment?: {
    accepted: true;
    acceptedAt: Timestamp;
    acceptedByUid: string;
    version: string;
    upcomingShowId: string;
  };
  createdBy: string;
  updatedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PrintRequestItem {
  id: string;
  printRequestId: string;
  /**
   * Catalog design id.
   * Required when `sourceType` is absent or `catalog_design`.
   * Must be **omitted** when `sourceType` is `customer_upload` (never empty string).
   */
  designId?: string;
  /** Defaults to `catalog_design` when absent (legacy documents). */
  sourceType?: PrintRequestItemSourceType;
  /** Required when `sourceType` is `customer_upload`. */
  customerUploadId?: string;
  /** Display fallback for upload-backed items. */
  titleSnapshot?: string;
  quantity: number;
  printWidthInches?: number;
  printHeightInches?: number;
  sizeLabel?: string;
  sortOrder?: number;
  notes?: string;
  status: PrintRequestItemStatus;
  addedBy: string;
  printedAt?: Timestamp;
  printedBy?: string;
  completedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /**
   * Server-only Wave C idempotency marker (`onPrintRequestItemCreated`).
   * Clients must not set or clear it. Not production status.
   */
  requestCountApplied?: boolean;
}
