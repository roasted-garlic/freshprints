import type { ShowProductionStatus } from "../upcomingShow/upcomingShow.enums";

export interface PortalAllocatableShow {
  id: string;
  scheduledStartAt: string | null;
  productionStatus: ShowProductionStatus;
  maxTotalQuantity?: number;
  allocatedQuantity: number;
  /**
   * This customer's non-canceled allocation quantity already on this show (Cap B usage).
   * Omitted/0 when the customer has nothing on the show.
   */
  customerAllocatedQuantity?: number;
  /**
   * False for past (calendar-only) shows. Omitted/true means the show can be queued to.
   */
  isAllocatable?: boolean;
  /**
   * True when now is at/after Portal queue cutoff (`scheduledStartAt − N hours`).
   * Calendar may still show the day; selection is blocked.
   */
  isPastQueueCutoff?: boolean;
  /** ISO cutoff instant for this show given current Studio setting (when scheduled). */
  queueCutoffAt?: string | null;
}

export interface ListPortalAllocatableShowsResponse {
  shows: PortalAllocatableShow[];
  /**
   * Hours before show start when Portal Add-to-Show closes.
   * From `settings/showQueue.portalQueueCutoffHoursBeforeStart` (default 5).
   */
  portalQueueCutoffHoursBeforeStart: number;
}
