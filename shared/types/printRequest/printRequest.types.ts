import type { Timestamp } from "firebase/firestore";

import type { PrintRequestItemStatus, PrintRequestStatus } from "./printRequest.enums";

export interface PrintRequest {
  id: string;
  name: string;
  customerId?: string;
  guestCustomerId?: string;
  isInternal: boolean;
  status: PrintRequestStatus;
  itemCount: number;
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
  notes?: string;
  status: PrintRequestItemStatus;
  addedBy: string;
  printedAt?: Timestamp;
  printedBy?: string;
  completedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
