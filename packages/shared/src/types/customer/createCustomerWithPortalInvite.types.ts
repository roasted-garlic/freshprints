export interface CreateCustomerWithPortalInviteRequest {
  displayName: string;
  username: string;
  email: string;
  notes?: string;
}

export interface CreateCustomerWithPortalInviteResponse {
  customerId: string;
  userId: string;
  email: string;
  displayName: string;
  username: string;
  invitationEmailSent: boolean;
  nextStep: string;
}
