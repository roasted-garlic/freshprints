import type { Timestamp } from "firebase/firestore";

import type { PrintRequestItemStatus, PrintRequestStatus } from "./printRequest.enums";

export type PrintRequestOrigin =
  | "studio_internal"
  | "studio_customer"
  | "portal_customer";

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
  designId: string;
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
