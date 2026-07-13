/** Donate confirm callable DTOs. */

export interface ConfirmCustomerUploadsForDonationRequest {
  batchId: string;
  uploadIds: string[];
  ownershipConfirmed: true;
  /** Required true for donations — server rejects false. */
  catalogUseAcknowledged: true;
  termsVersion: string;
}

export interface ConfirmCustomerUploadsForDonationResponse {
  confirmedUploadIds: string[];
  batchId: string;
}
