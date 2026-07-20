import type { Timestamp } from "firebase/firestore";

import type { CustomerAccountDeletionRequestMirror } from "../account/portalAccountSettings.types";
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
  /**
   * When false, skip Assisted Creation proof-ready email notices.
   * Missing / undefined means opted in.
   */
  assistedProofEmailOptIn?: boolean;
  assistedProofEmailOptInUpdatedAt?: Timestamp;
  /** Missing means opted in (opt-out model). Browser / Web Push alerts. */
  assistedBrowserPushOptIn?: boolean;
  assistedBrowserPushOptInUpdatedAt?: Timestamp;
  /** Mirrored from accountDeletionRequests for Portal UX (Admin SDK writes). */
  accountDeletionRequest?: CustomerAccountDeletionRequestMirror;
  usernameUpdatedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
