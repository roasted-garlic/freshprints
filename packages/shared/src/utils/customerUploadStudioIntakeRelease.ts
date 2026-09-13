/**
 * Print-request uploads stay off Studio Uploaded Designs Denied/Excluded until Add to Show.
 * New Don’t-allow attaches set `studioIntakeHoldUntilShow: true`; release clears it.
 * Legacy rows without the hold flag remain visible.
 */
export function isCustomerUploadReleasedToStudioIntake(data: {
  studioIntakeHoldUntilShow?: unknown;
  studioIntakeReleasedAt?: unknown;
}): boolean {
  if (data.studioIntakeHoldUntilShow === true) {
    return false;
  }
  return true;
}
