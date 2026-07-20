/**
 * User-facing reason the Upload Designs / Donate primary action is disabled.
 * Ownership confirmation is required (client + Functions); do not treat green
 * request-room copy as the only gate.
 */
export function resolveCustomerUploadAttachDisabledReason(input: {
  isDonation: boolean;
  readyCount: number;
  ownershipConfirmed: boolean;
  catalogUseAcknowledged: boolean;
  isProcessing: boolean;
  isAttaching: boolean;
  /** False while working-request limit / items are still hydrating. */
  isQuotaReady?: boolean;
  isRequestFull: boolean;
  canAddPrints: boolean;
  exhaustedStatusText?: string | null;
  maxImagesForRequest?: number | null;
}): string | null {
  if (input.isAttaching) {
    return input.isDonation ? 'Submitting donation…' : 'Adding to request…';
  }
  if (input.isProcessing) {
    return 'Wait for uploads to finish processing.';
  }
  if (!input.isDonation && input.isQuotaReady === false) {
    return 'Checking print limits…';
  }
  if (!input.isDonation && (input.isRequestFull || !input.canAddPrints)) {
    return input.exhaustedStatusText?.trim() || 'This request is full.';
  }
  if (input.readyCount <= 0) {
    return input.isDonation
      ? 'Upload at least one ready image to donate.'
      : 'Upload at least one ready image to add.';
  }
  if (
    !input.isDonation &&
    input.maxImagesForRequest != null &&
    input.readyCount > input.maxImagesForRequest
  ) {
    const slots = input.maxImagesForRequest;
    return slots === 1
      ? 'Only 1 print slot left on this request. Remove an image or lower quantities first.'
      : `Only ${slots} print slots left on this request. Remove images or lower quantities first.`;
  }
  if (!input.ownershipConfirmed) {
    return input.isDonation
      ? 'Confirm you own this artwork or have permission to donate it.'
      : 'Confirm you own this artwork or have permission to print it.';
  }
  if (input.isDonation && !input.catalogUseAcknowledged) {
    return 'Confirm you understand these images are donated to the design library.';
  }
  return null;
}
