/**
 * Per Current Request print max (= sole limit `L` = `maxQuantityPerShowPerCustomer`).
 * Same `L` is enforced per customer per show at queue time (atomic full fit or reject).
 */

function finiteNonNeg(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

function finitePositive(value: number): number | null {
  if (!Number.isFinite(value) || value < 1) {
    return null;
  }
  return Math.floor(value);
}

/** True when adding `addCount` would push the working request over the max. */
export function wouldExceedWorkingRequestPrintMax(
  currentPrintCount: number,
  addCount: number,
  maxPerRequest: number,
): boolean {
  const current = finiteNonNeg(currentPrintCount);
  const add = finiteNonNeg(addCount);
  const max = finitePositive(maxPerRequest);
  if (max == null || add < 1) {
    return true;
  }
  return current + add > max;
}

/** Room left on this request before hitting the max. */
export function workingRequestPrintRoomRemaining(
  currentPrintCount: number,
  maxPerRequest: number,
): number {
  const max = finitePositive(maxPerRequest);
  if (max == null) {
    return 0;
  }
  return Math.max(0, max - finiteNonNeg(currentPrintCount));
}

export function isWorkingRequestPrintFull(
  currentPrintCount: number,
  maxPerRequest: number,
): boolean {
  const max = finitePositive(maxPerRequest);
  if (max == null) {
    return false;
  }
  return finiteNonNeg(currentPrintCount) >= max;
}

/**
 * Clamp a line qty so the working request stays within `L`.
 *
 * Room = maxPerRequest − otherItemsPrintCount (exclude this line).
 * Result = min(requestedQty, room). Never snaps a line to 1 unless room is actually 1;
 * when room is 0, keeps currentQuantity.
 */
export function clampItemQuantityToWorkingRequestMax(input: {
  requestedQuantity: number;
  currentQuantity: number;
  otherItemsPrintCount: number;
  maxPerRequest: number;
}): number {
  const current = Math.max(1, finiteNonNeg(input.currentQuantity));
  const requested = Math.floor(Number(input.requestedQuantity));
  if (!Number.isFinite(requested) || requested < 1) {
    return current;
  }

  // Decreases (or same): no working-max clamp beyond min 1.
  if (requested <= current) {
    return requested;
  }

  const room = workingRequestPrintRoomRemaining(
    input.otherItemsPrintCount,
    input.maxPerRequest,
  );
  const maxAllowed = room;

  if (maxAllowed < 1) {
    // No headroom — keep current rather than snapping to 1.
    return current;
  }

  return Math.min(requested, maxAllowed);
}

/** Short status line (cards / toasts). */
export function formatWorkingRequestFullStatusLine(maxPerRequest: number): string {
  const max = finitePositive(maxPerRequest) ?? 0;
  return `This request is full (${max} prints)`;
}

/**
 * Next-step helper under the designs · prints summary when the request is full.
 * Plain language: free room by removing prints; queue when ready.
 */
export function formatWorkingRequestFullHelperText(): string {
  return "Remove prints to free room for other designs, or add this request to a show when you're ready.";
}

/** Full toast / alert when blocked for request max. */
export function formatWorkingRequestFullUserMessage(maxPerRequest: number): string {
  const max = finitePositive(maxPerRequest) ?? 0;
  return `This request already has the maximum of ${max} prints. Remove prints to free room before adding more, or add this request to a show.`;
}

/**
 * Upload Designs overlay when Current Request is at L.
 * Title reuses the short status line; body tells customers to return when there is room.
 */
export function formatWorkingRequestFullUploadOverlayTitle(maxPerRequest: number): string {
  return formatWorkingRequestFullStatusLine(maxPerRequest);
}

export function formatWorkingRequestFullUploadOverlayBody(): string {
  return "Come back when this request is not full to upload your own images. Remove prints to free room, or add this request to a show first.";
}

/** Footer/status hint when the current request still has print slots for uploads. */
export function formatWorkingRequestUploadRoomHint(roomRemaining: number): string {
  const room = finiteNonNeg(roomRemaining);
  if (room === 1) {
    return "You can upload up to 1 image for the current request.";
  }
  return `You can upload up to ${room} images for the current request.`;
}

/** Soft note when a multi-file pick is truncated to remaining print slots. */
export function formatWorkingRequestUploadRoomCapNote(
  acceptedCount: number,
  attemptedCount: number,
): string {
  const accepted = finiteNonNeg(acceptedCount);
  const attempted = finiteNonNeg(attemptedCount);
  if (accepted < 1) {
    return "This request has no print slots left for more uploads.";
  }
  if (accepted >= attempted) {
    return formatWorkingRequestUploadRoomHint(accepted);
  }
  return `Only ${accepted} image${accepted === 1 ? "" : "s"} could be added (${accepted} print${accepted === 1 ? "" : "s"} left on this request).`;
}

/**
 * Cap how many images this upload session may hold given batch max and request room.
 * `maxImagesForRequest` null/undefined = no request-room cap (donation or limit not ready).
 */
export function resolveUploadSessionImageCap(input: {
  maxFilesPerBatch: number;
  maxImagesForRequest?: number | null;
}): number {
  const batchMax = Math.max(0, finiteNonNeg(input.maxFilesPerBatch));
  if (input.maxImagesForRequest == null || !Number.isFinite(input.maxImagesForRequest)) {
    return batchMax;
  }
  return Math.min(batchMax, finiteNonNeg(input.maxImagesForRequest));
}

/** Queue blocked because Continuable already exceeds `L` (over-limit compat). */
export function formatWorkingRequestOverLimitForQueueMessage(maxPerRequest: number): string {
  const max = finitePositive(maxPerRequest) ?? 0;
  return `This request has more than ${max} prints. Remove or lower quantities until you have ${max} or fewer, then add to a show.`;
}

export type WorkingRequestLimitBannerTone = "healthy" | "warning" | "exhausted";

/**
 * Banner tone for room left on the Current Request (same thresholds as the old Cap A banner).
 * Warning when ≤20% left or ≤5 prints left (whichever is larger of those cues).
 */
export function resolveWorkingRequestLimitBannerTone(
  remaining: number,
  limit: number,
): WorkingRequestLimitBannerTone {
  const room = finiteNonNeg(remaining);
  const max = finitePositive(limit);
  if (max == null) {
    return "healthy";
  }
  if (room <= 0) {
    return "exhausted";
  }
  const twentyPercent = Math.max(1, Math.ceil(max * 0.2));
  if (room <= 5 || room <= twentyPercent) {
    return "warning";
  }
  return "healthy";
}

/** Sticky top banner: remaining-style fill against L. */
export function formatWorkingRequestLimitBannerCopy(remaining: number, limit: number): string {
  const room = finiteNonNeg(remaining);
  const max = finitePositive(limit) ?? 0;
  return `${room} of ${max} prints left for this request`;
}

/** Portal print-limits help modal title (owner copy). */
export const WORKING_REQUEST_LIMIT_HELP_MODAL_TITLE = "Request and Show Limits";

/**
 * Illustrative multi-request fill for the show-cap sentence.
 * Owner wording uses five×five when the show limit is 25; otherwise a simple
 * proportional example (or no "such as" clause if no clean factors).
 */
function formatShowMultiRequestExample(showMax: number): string | null {
  if (showMax === 25) {
    return "such as five requests with five prints each";
  }
  if (showMax >= 10 && showMax % 5 === 0) {
    return `such as ${showMax / 5} requests with 5 prints each`;
  }
  if (showMax >= 4 && showMax % 2 === 0) {
    return `such as 2 requests with ${showMax / 2} prints each`;
  }
  return null;
}

/**
 * Help modal lines for Portal print limits.
 * Request capacity (X) and per-show-per-customer cap (Y) come from live Studio settings
 * (same sole `L` today; both args so copy stays correct if they diverge).
 * Customers may queue multiple requests to the same show until they hit Y prints.
 * Show-wide capacity ("a max of 200") is illustrative owner wording, not live per-show maxTotalQuantity.
 * Includes owner note that building/submitting a request does not cost money up front
 * (payment is on the Whatnot show). No Cap A/B jargon; no em dashes.
 */
export function formatWorkingRequestLimitHelpModalCopy(
  maxPerRequest: number,
  maxPerShow: number = maxPerRequest,
): string[] {
  const requestMax = finitePositive(maxPerRequest) ?? 0;
  const showMax = finitePositive(maxPerShow) ?? requestMax;
  const multiExample = formatShowMultiRequestExample(showMax);
  const multiClause = multiExample
    ? `one request or multiple requests, ${multiExample}`
    : "one request or multiple requests";
  return [
    `Print requests are for Fresh Prints Whatnot shows (live shopping). Each request can include up to ${requestMax} prints. You may submit a request with fewer prints if needed, but you cannot exceed this limit within a single request.`,
    "Building and submitting a print request does not cost any money up front. Payment happens when you buy on the Fresh Prints Whatnot show.",
    `Each Whatnot show can also hold up to ${showMax} prints per customer and a max of 200. These prints can come from ${multiClause}.`,
    `Once a show reaches its ${showMax}-print limit, any additional prints must be assigned to a different show. To add new designs to a full show, you will need to remove prints or reduce quantities to free up space.`,
  ];
}
