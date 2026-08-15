import type { Timestamp } from "firebase/firestore";

import type {
  ShowProductionStatus,
  UpcomingShowSource,
  UpcomingShowStatus,
  UpcomingShowSyncStatus,
} from "./upcomingShow.enums";

/**
 * Combined Whatnot show / Staff Gang Sheet production lane.
 * Source-conditional fields:
 * - `whatnot`: `whatnotShowId` required; Staff fields absent
 * - `staff_gang_sheet`: `assignedStaffUserId` + `staffGangSheetCycleNumber` required;
 *   `whatnotShowId` and `maxTotalQuantity` omitted
 */
export interface UpcomingShow {
  id: string;
  source: UpcomingShowSource;
  /** Required when source === "whatnot"; omitted for staff_gang_sheet. */
  whatnotShowId?: string;
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

  /** A show / Staff Gang Sheet is the print run — this is the only production entity. */
  productionStatus: ShowProductionStatus;
  /** Staff-set capacity. Undefined means no cap is enforced (Staff Gang Sheets omit this). */
  maxTotalQuantity?: number;
  /** True when staff used the danger override to exceed `maxTotalQuantity`. Portal customers may never set this. */
  maxQuantityOverridden: boolean;
  /** Sum of `allocatedQuantity` across all non-canceled `showAllocations` for this show. Denormalized for list/detail display. */
  allocatedQuantity: number;

  /** Staff Gang Sheet: assigned helper/staff UID. */
  assignedStaffUserId?: string;
  /** Staff Gang Sheet: 1-based cycle number shown as "Staff Gang Sheet #N". */
  staffGangSheetCycleNumber?: number;

  /** Elapsed print time in milliseconds, excluding any active unpaused segment. */
  accumulatedPrintMs: number;
  /** Set while the timer is running (not paused). */
  activePrintStartedAt?: Timestamp;
  /** First time staff started printing for this show. */
  printStartedAt?: Timestamp;
  /** Set when staff pauses the timer; cleared on resume. */
  printPausedAt?: Timestamp;
  /** Set when staff marks the show printing finished. */
  printFinishedAt?: Timestamp;
  printFinishedBy?: string;

  createdBy?: string;
  updatedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export function isStaffGangSheetShow(show: {
  source: UpcomingShowSource;
}): boolean {
  return show.source === "staff_gang_sheet";
}

export function isWhatnotUpcomingShow(show: {
  source: UpcomingShowSource;
}): boolean {
  return show.source === "whatnot";
}
