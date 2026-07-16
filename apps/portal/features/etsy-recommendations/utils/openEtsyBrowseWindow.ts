import { sanitizeEtsyBrowseUrl } from '@fresh-prints/shared/utils/etsyRecommendationListingUrl';

const ETSY_BROWSE_WINDOW_NAME = 'fpEtsyBrowse';
const ETSY_BROWSE_FEATURES = [
  'width=1100',
  'height=820',
  'left=80',
  'top=60',
  'menubar=no',
  'toolbar=no',
  'location=yes',
  'status=no',
  'resizable=yes',
  'scrollbars=yes',
].join(',');

/**
 * Sized popups are unreliable on phones/tablets (often blocked or ignored).
 * When false, callers should let the native `<a target="_blank">` navigate.
 */
function prefersSizedPopup(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const noHover = window.matchMedia('(hover: none)').matches;
  const narrowViewport = window.matchMedia('(max-width: 900px)').matches;
  return !coarsePointer && !noHover && !narrowViewport;
}

/**
 * Opens Etsy in a sized desktop popup when supported.
 * Returns true only if this helper opened the URL (caller should preventDefault).
 * Returns false on mobile / blocked popup so the native anchor can open Etsy.
 */
export function openEtsyBrowseWindow(etsyUrl: string): boolean {
  const safe = sanitizeEtsyBrowseUrl(etsyUrl);
  if (!safe) {
    return false;
  }

  if (!prefersSizedPopup()) {
    return false;
  }

  const popup = window.open(safe, ETSY_BROWSE_WINDOW_NAME, ETSY_BROWSE_FEATURES);
  if (!popup) {
    // Do not attempt a second window.open — mobile/Safari often allows only one
    // gesture-driven navigation, and a retry after a failed popup also fails.
    return false;
  }

  popup.focus();
  return true;
}
