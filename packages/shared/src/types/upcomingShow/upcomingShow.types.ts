import type { Timestamp } from "firebase/firestore";

import type {
  ShowProductionStatus,
  UpcomingShowSource,
  UpcomingShowStatus,
  UpcomingShowSyncStatus,
} from "./upcomingShow.enums";
import type { ShowProductionResolutionKind } from "../showProductionRecovery/showProductionRecovery.types";

/**
 * Combined Whatnot show / Staff Gang Sheet / DEV fixture production lane.
 * Source-conditional fields:
 * - `whatnot`: `whatnotShowId` required; Staff fields absent
 * - `staff_gang_sheet`: `staffGangSheetCycleNumber` required; shared by Studio staff
 *   (no assignee). `whatnotShowId` and `maxTotalQuantity` omitted.
 *   Legacy DEV docs may still carry optional `assignedStaffUserId` (ignored).
 * - `dev_fixture`: DEV-only test shows without external Whatnot identity (`devFixtureSentinel`
 *   only on fresh-prints-dev via Admin callable). `whatnotShowId` and `whatnotUrl` omitted.
 */
export interface UpcomingShow {
  id: string;
  source: UpcomingShowSource;
  /** Required when source === "whatnot"; omitted for staff_gang_sheet and dev_fixture. */
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

  /**
   * Legacy DEV-only optional field from the superseded assigned-lane model.
   * Shared Staff Gang Sheets do not require or write this.
   */
  assignedStaffUserId?: string;
  /** Staff Gang Sheet: 1-based cycle number shown as "Internal Gang Sheet #N". */
  staffGangSheetCycleNumber?: number;

  /** DEV-only fixture marker when source === "dev_fixture" (exact sentinel `DEV-OVERRIDE`). */
  devFixtureSentinel?: string;

  /**
   * Optional: set when staff successfully generates gang sheet PNG(s) for this show / Internal Gangsheet.
   * Not required to Mark Complete or Mark finished.
   */
  gangSheetGeneratedAt?: Timestamp;
  gangSheetGeneratedBy?: string;

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

  /** Optional audit metadata for past-show remediation (ADR-FP-149). */
  productionResolutionKind?: ShowProductionResolutionKind;
  productionResolvedAt?: Timestamp;
  productionResolvedBy?: string;
  /** Owner override reason; max length documented in DATA_MODEL. */
  productionOverrideReason?: string;

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

/** True for shows listed on the Whatnot Show Queue surface (real Whatnot + DEV fixtures). */
export function isWhatnotQueueSurfaceShow(show: {
  source: UpcomingShowSource;
}): boolean {
  return show.source === "whatnot" || show.source === "dev_fixture";
}

export function isDevFixtureShow(show: {
  source: UpcomingShowSource;
}): boolean {
  return show.source === "dev_fixture";
}

/** True when staff has successfully generated a gang sheet for this production lane. */
export function hasShowGangSheetBeenGenerated(show: {
  gangSheetGeneratedAt?: Timestamp | null;
}): boolean {
  return show.gangSheetGeneratedAt != null;
}
