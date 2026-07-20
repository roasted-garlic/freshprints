/**
 * Code defaults for the sole Portal print-request limit `L`
 * (`maxQuantityPerShowPerCustomer`: max Current Request = max per customer per show).
 * Studio Settings (`settings/printRequestLimits`) overrides at runtime.
 *
 * `PRINT_REQUEST_DAILY_DESIGNS_ADDED_LIMIT` is legacy Cap A default kept for one-release
 * mirror-write compatibility only — not enforced.
 */
export const PRINT_REQUEST_DAILY_DESIGNS_ADDED_LIMIT = 20;
export const PRINT_REQUEST_MAX_QUANTITY_PER_SHOW_PER_CUSTOMER = 20;

/**
 * Legacy Cap A counter collection (Admin SDK only).
 * No longer written by Portal callables; wipe target may remain for cleanup.
 */
export const PRINT_REQUEST_DESIGN_DAILY_LIMITS_COLLECTION = "printRequestDesignDailyLimits";
