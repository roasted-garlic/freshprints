/**
 * Global "show censored content" customer preference — localStorage only, mirrors
 * `themeService` (apps/portal/features/theme/services/themeService.ts). Not a security
 * boundary: censoring is presentation-only, so this preference is safe to keep client-side
 * for both guests and authenticated customers (no Firestore customer-preference doc needed).
 */
export const EXPLICIT_CONTENT_PREFERENCE_STORAGE_KEY = 'fresh-prints-portal-show-explicit-content';

export const explicitContentPreferenceService = {
  /** Default is `false` (censor) — matches the product default for guests and customers. */
  getStoredShowExplicitContent(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(EXPLICIT_CONTENT_PREFERENCE_STORAGE_KEY) === 'true';
  },

  storeShowExplicitContent(showExplicitContent: boolean): void {
    window.localStorage.setItem(
      EXPLICIT_CONTENT_PREFERENCE_STORAGE_KEY,
      showExplicitContent ? 'true' : 'false',
    );
  },
};
