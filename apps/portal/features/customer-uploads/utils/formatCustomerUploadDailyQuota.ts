import type { GetCustomerUploadDailyQuotaResponse } from '@fresh-prints/shared/types/customerUpload/customerUploadDailyQuota.types';

function formatImagesLeftToday(remaining: number, limit: number): string {
  const label = remaining === 1 ? 'donated image' : 'donated images';
  return `${remaining} of ${limit} ${label} left today`;
}

/**
 * Remaining daily quota copy for Portal **Donate Designs** only.
 * Images/day + midnight CST (America/Chicago) reset.
 * Upload Designs must not use this — it shows request-room copy only.
 */
export function formatCustomerUploadDailyQuota(quota: GetCustomerUploadDailyQuotaResponse): string {
  return `${formatImagesLeftToday(quota.images.remaining, quota.images.limit)} (resets at midnight CST).`;
}
