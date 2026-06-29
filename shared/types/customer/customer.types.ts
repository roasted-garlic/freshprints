import type { Timestamp } from "firebase/firestore";

export interface Customer {
  id: string;
  userId?: string;
  displayName: string;
  email?: string;
  notes?: string;
  isGuest: boolean;
  totalPrintRequests: number;
  /** @deprecated — use `totalPrintRequests` */
  totalRequests?: number;
  /** @deprecated — custom requests only (Phase 9) */
  totalApprovedRequests?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
