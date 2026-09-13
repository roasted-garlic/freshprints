/** Gallery re-attach of existing customer uploads onto a print request. */

import {
  CUSTOMER_UPLOAD_ATTACH_QUANTITY_MAX,
  CUSTOMER_UPLOAD_ATTACH_QUANTITY_MIN,
} from "./confirmCustomerUploadAttach.types";

export { CUSTOMER_UPLOAD_ATTACH_QUANTITY_MAX, CUSTOMER_UPLOAD_ATTACH_QUANTITY_MIN };

export interface AttachExistingCustomerUploadsToPrintRequestRequest {
  uploadIds: string[];
  /** When omitted, resolve or create the working Continuable request. */
  printRequestId?: string;
  defaultQuantity?: number;
}

export interface AttachExistingCustomerUploadsToPrintRequestResponse {
  printRequestId: string;
  attachedItemIds: string[];
  reusedItemIds: string[];
}
