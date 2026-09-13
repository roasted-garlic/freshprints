import type { CustomerIdentitySnapshotPropagationStatus } from "./customerIdentity.types";

export interface UpdatePortalCustomerProfileRequest {
  displayName: string;
  username: string;
}

export interface UpdatePortalCustomerProfileResponse {
  customerId: string;
  displayName: string;
  username: string;
  usernameChanged: boolean;
  displayNameChanged: boolean;
  portalAuthDisplayNameSynced: boolean;
  propagationComplete: boolean;
  propagationStatus: CustomerIdentitySnapshotPropagationStatus;
  printRequestsUpdated: number;
  designIssueReportsUpdated: number;
}
