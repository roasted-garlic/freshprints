import type { Timestamp } from "firebase/firestore";

export type UserRole = "owner" | "admin" | "helper" | "customer";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}

export const userRoles: UserRole[] = ["owner", "admin", "helper", "customer"];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && userRoles.includes(value as UserRole);
}
