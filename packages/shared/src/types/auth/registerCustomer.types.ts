export interface RegisterCustomerRequest {
  displayName: string;
  username: string;
  /** Required for new provisions: customer checked bidding understanding before create. */
  biddingAcknowledgmentAccepted: boolean;
  /** Must match current PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION. */
  biddingAcknowledgmentVersion: string;
}

export interface RegisterCustomerResponse {
  userId: string;
  customerId: string;
  email: string;
  displayName: string;
  username: string;
  alreadyProvisioned: boolean;
}
