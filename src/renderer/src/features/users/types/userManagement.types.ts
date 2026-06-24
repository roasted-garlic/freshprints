import type { TeamUserRole, UserRole } from "./user.types";

export interface CreateTeamUserInput {
  email: string;
  displayName: string;
  role: TeamUserRole;
}

export interface CreateTeamUserResult {
  userId: string;
  email: string;
  displayName: string;
  role: TeamUserRole;
  invitationEmailSent: boolean;
  nextStep: string;
}

export interface UpdateTeamUserInput {
  targetUserId: string;
  isActive: boolean;
  role?: TeamUserRole;
}

export interface UpdateTeamUserResult {
  userId: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  authDisabled: boolean;
}
