import { isCustomerUploadPrintRequestItem } from "@fresh-prints/shared/utils/printRequestItemSource";
import type { PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";

export type PrintRequestItemLibraryConsentIcon = "approved" | "denied";

type UploadConsentSource = {
  catalogUseAcknowledged?: boolean | null;
  assistedCreationRequestId?: string | null;
  fromAssistedCreation?: boolean;
};

function isAssistedUpload(upload: UploadConsentSource | null | undefined): boolean {
  if (!upload) {
    return false;
  }
  if (upload.fromAssistedCreation === true) {
    return true;
  }
  return Boolean(upload.assistedCreationRequestId?.trim());
}

/**
 * Corner icon for Design Library consent on customer-uploaded (non-assisted) items.
 * Returns null for catalog items, assisted copies, and pending/legacy (unknown) consent.
 */
export function resolvePrintRequestItemLibraryConsentIcon(
  item: Pick<PrintRequestItem, "sourceType" | "customerUploadId">,
  upload: UploadConsentSource | null | undefined,
): PrintRequestItemLibraryConsentIcon | null {
  if (!isCustomerUploadPrintRequestItem(item)) {
    return null;
  }
  if (isAssistedUpload(upload)) {
    return null;
  }

  const consent = upload?.catalogUseAcknowledged;
  if (consent === true) {
    return "approved";
  }
  if (consent === false) {
    return "denied";
  }
  return null;
}
