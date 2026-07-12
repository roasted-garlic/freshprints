import type { Timestamp } from "firebase/firestore";

import type { PrintRequestItemStatus, PrintRequestStatus } from "./printRequest.enums";

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
  requestSequenceNumber?: number;
  customerUsernameSnapshot?: string;
  customerDisplayNameSnapshot?: string;
  internalBaseName?: string;
  nameFormatVersion?: "legacy-v1" | "cr-ir-v1";
  notes?: string;
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
}
