import type { Timestamp } from "firebase/firestore";

import type { CustomerSignupSource } from "./customer.enums";

export interface Customer {
  id: string;
  userId?: string;
  displayName: string;
  username?: string;
  email?: string;
  notes?: string;
  isGuest: boolean;
  /** How the customer record was created: staff directory (studio) or Portal self-registration (portal). */
  signupSource?: CustomerSignupSource;
  totalPrintRequests: number;
  nextPrintRequestSequence?: number;
  /** @deprecated — use `totalPrintRequests` */
  totalRequests?: number;
  /** @deprecated — custom requests only (Phase 9) */
  totalApprovedRequests?: number;
  usernameUpdatedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
