export type TeamUserRole = "owner" | "admin" | "helper";

export interface TeamUserProfile {
  id: string;
  email: string;
  displayName: string;
  role: TeamUserRole;
  isActive: boolean;
}

export interface CreateTeamUserRequest {
  email: string;
  displayName: string;
  role: TeamUserRole;
}

export interface CreateTeamUserResponse {
  userId: string;
  email: string;
  displayName: string;
  role: TeamUserRole;
  invitationEmailSent: boolean;
  nextStep: string;
}

export interface UpdateTeamUserRequest {
  targetUserId: string;
  isActive: boolean;
  role?: TeamUserRole;
}

export interface UpdateTeamUserResponse {
  userId: string;
  displayName: string;
  role: TeamUserRole;
  isActive: boolean;
  authDisabled: boolean;
}
