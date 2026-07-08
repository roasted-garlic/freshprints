export interface RegisterCustomerRequest {
  displayName: string;
  username: string;
}

export interface RegisterCustomerResponse {
  userId: string;
  customerId: string;
  email: string;
  displayName: string;
  username: string;
  alreadyProvisioned: boolean;
}
