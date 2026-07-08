import type { Timestamp } from "firebase/firestore";

import type {
  ShowProductionStatus,
  UpcomingShowSource,
  UpcomingShowStatus,
  UpcomingShowSyncStatus,
} from "./upcomingShow.enums";

export interface UpcomingShow {
  id: string;
  source: UpcomingShowSource;
  whatnotShowId: string;
  whatnotUrl?: string;
  title?: string;
  scheduledStartAt?: Timestamp;
  status: UpcomingShowStatus;
  syncStatus: UpcomingShowSyncStatus;
  syncError?: string;
  lastSyncedAt?: Timestamp;
  lastSeenAt?: Timestamp;
  /** The exact base URL a staff-assisted import used when this record was last touched. */
  sourceBaseUrlSnapshot?: string;
  /** Set every time this show appears as a candidate in a staff-confirmed assisted import. */
  lastSeenInAssistedImportAt?: Timestamp;
  notes?: string;
  isArchived: boolean;

  /** A Whatnot show is the print run — this is the only production entity for Phase 7. */
  productionStatus: ShowProductionStatus;
  /** Staff-set capacity. Undefined means no cap is enforced. */
  maxTotalQuantity?: number;
  /** True when staff used the danger override to exceed `maxTotalQuantity`. Portal customers may never set this. */
  maxQuantityOverridden: boolean;
  /** Sum of `allocatedQuantity` across all non-canceled `showAllocations` for this show. Denormalized for list/detail display. */
  allocatedQuantity: number;

  createdBy?: string;
  updatedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
