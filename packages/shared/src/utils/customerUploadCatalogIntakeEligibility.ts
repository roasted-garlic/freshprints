/**
 * Print-request uploads where the customer declined Design Library permission
 * are print-only: they must not enter Studio pending intake or catalog promotion.
 */
export function isCustomerUploadEligibleForCatalogIntake(data: {
  catalogUseAcknowledged?: boolean | null;
  catalogPermissionFollowUpStatus?: string | null;
}): boolean {
  if (data.catalogUseAcknowledged !== false) {
    return true;
  }
  return data.catalogPermissionFollowUpStatus === "approved";
}
