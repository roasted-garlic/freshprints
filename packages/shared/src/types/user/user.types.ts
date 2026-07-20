import type { Timestamp } from "firebase/firestore";

import type { PortalBiddingAcknowledgmentSource } from "../../constants/portal/portalBiddingAcknowledgment.constants";

export type UserRole = "owner" | "admin" | "helper" | "customer";

export interface PortalBiddingAcknowledgmentRecord {
  acceptedAt: Timestamp;
  version: string;
  source: PortalBiddingAcknowledgmentSource;
  printRequestId?: string;
  upcomingShowId?: string;
}

export interface PortalBiddingAcknowledgments {
  signup?: PortalBiddingAcknowledgmentRecord;
  lastQueueToShow?: PortalBiddingAcknowledgmentRecord;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  portalBiddingAcknowledgments?: PortalBiddingAcknowledgments;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

export const userRoles: UserRole[] = ["owner", "admin", "helper", "customer"];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && userRoles.includes(value as UserRole);
}
