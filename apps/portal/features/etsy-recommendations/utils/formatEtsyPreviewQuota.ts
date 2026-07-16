import type { EtsyRecommendationPreviewQuota } from '@fresh-prints/shared/types/etsyRecommendation/etsyRecommendationActions.types';

export function formatEtsyPreviewQuota(quota: EtsyRecommendationPreviewQuota): string {
  if (quota.unlimited) {
    return 'Test account: the listing preview cards below have no daily refresh limit on this login.';
  }
  return `Listing preview cards below: ${quota.customerRemaining} of ${quota.customerLimit} refreshes left today (resets at midnight UTC).`;
}

export const ETSY_PREVIEW_QUOTA_SCOPE_NOTE =
  'This limit is only for the in-app preview cards. Best match and More options on Etsy are always unlimited.';

export const ETSY_PREVIEW_QUOTA_UNLIMITED_NOTE =
  'Best match and More options on Etsy stay unlimited for everyone.';
