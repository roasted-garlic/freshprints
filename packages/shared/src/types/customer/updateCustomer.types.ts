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
  usernameChanged: boolean;
}
