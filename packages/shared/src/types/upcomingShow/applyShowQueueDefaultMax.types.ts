/**
 * Request/response for `applyShowQueueDefaultMaxToEligibleShows`.
 * `defaultMaxTotalQuantity: null` clears the global default and eligible show max fields.
 */

export interface ApplyShowQueueDefaultMaxToEligibleShowsRequest {
  /** Finite non-negative capacity, or `null` to clear (no limit). */
  defaultMaxTotalQuantity: number | null;
}

export interface ApplyShowQueueDefaultMaxToEligibleShowsResponse {
  defaultMaxTotalQuantity: number | null;
  updatedShowCount: number;
  skippedBelowAllocatedCount: number;
}

export interface ApplyShowQueueDefaultMaxPartialFailureDetails {
  updatedShowCount: number;
  skippedBelowAllocatedCount: number;
  failedChunkIndex: number;
  message: string;
}
