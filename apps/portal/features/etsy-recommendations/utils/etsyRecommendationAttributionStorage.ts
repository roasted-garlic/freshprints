const ETSY_UPLOAD_ATTRIBUTION_STORAGE_KEY = 'fp.etsyRecommendation.uploadAttribution.v1';

export interface EtsyRecommendationUploadAttribution {
  etsyRecommendationRequestId: string;
  reportedPurchased: boolean;
}

export function saveEtsyRecommendationUploadAttribution(
  attribution: EtsyRecommendationUploadAttribution,
): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.setItem(
      ETSY_UPLOAD_ATTRIBUTION_STORAGE_KEY,
      JSON.stringify(attribution),
    );
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function loadEtsyRecommendationUploadAttribution(): EtsyRecommendationUploadAttribution | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(ETSY_UPLOAD_ATTRIBUTION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<EtsyRecommendationUploadAttribution>;
    if (
      typeof parsed.etsyRecommendationRequestId !== 'string' ||
      !parsed.etsyRecommendationRequestId.trim() ||
      typeof parsed.reportedPurchased !== 'boolean'
    ) {
      return null;
    }
    return {
      etsyRecommendationRequestId: parsed.etsyRecommendationRequestId.trim(),
      reportedPurchased: parsed.reportedPurchased,
    };
  } catch {
    return null;
  }
}

export function clearEtsyRecommendationUploadAttribution(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.removeItem(ETSY_UPLOAD_ATTRIBUTION_STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
