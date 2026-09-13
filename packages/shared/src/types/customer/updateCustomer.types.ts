import type { CustomerIdentitySnapshotPropagationStatus } from "./customerIdentity.types";

export interface UpdateCustomerRequest {
  customerId: string;
  displayName: string;
  username: string;
  email?: string;
  notes?: string;
}

export interface UpdateCustomerResponse {
  customerId: string;
  displayName: string;
  username: string;
  email?: string;
  portalAuthEmailSynced: boolean;
  portalAuthDisplayNameSynced?: boolean;
  usernameChanged: boolean;
  displayNameChanged?: boolean;
  propagationComplete?: boolean;
  propagationStatus?: CustomerIdentitySnapshotPropagationStatus;
  printRequestsUpdated?: number;
  designIssueReportsUpdated?: number;
  /** Present when canonical profile saved but snapshot propagation failed or is incomplete. */
  propagationWarning?: string;
}
