import { buildPortalAuthHref, getCurrentPortalPath } from './portalReturnUrl';

type PortalRouterLike = {
  push: (href: string) => void;
};

/**
 * Build `/login?returnTo=…` for a guest mutation CTA.
 * Prefer an explicit return path (e.g. catalog deep link) when the action is design-scoped.
 */
export function buildPortalLoginHref(returnTo?: string | null): string {
  const target =
    returnTo != null && returnTo.trim()
      ? returnTo
      : typeof window !== 'undefined'
        ? getCurrentPortalPath(window.location)
        : '/';
  return buildPortalAuthHref('/login', target);
}

/**
 * Prefer an explicit app path (e.g. from `usePathname()`) for SSR-safe login links in the shell.
 */
export function buildPortalLoginHrefForPath(pathname: string | null | undefined): string {
  return buildPortalLoginHref(pathname?.trim() ? pathname : '/');
}

/** Build `/register?returnTo=…` for guest signup CTAs. */
export function buildPortalRegisterHref(returnTo?: string | null): string {
  const target =
    returnTo != null && returnTo.trim()
      ? returnTo
      : typeof window !== 'undefined'
        ? getCurrentPortalPath(window.location)
        : '/';
  return buildPortalAuthHref('/register', target);
}

/**
 * Prefer an explicit app path (e.g. from `usePathname()`) for SSR-safe register links in the shell.
 */
export function buildPortalRegisterHrefForPath(pathname: string | null | undefined): string {
  return buildPortalRegisterHref(pathname?.trim() ? pathname : '/');
}

/**
 * Interstitial explaining login is required before authenticated features.
 * Prefer in-shell guest overlay for `(app)` gated routes; keep for bookmarks / deep links.
 */
export function buildPortalLoginRequiredHref(returnTo?: string | null): string {
  const target =
    returnTo != null && returnTo.trim()
      ? returnTo
      : typeof window !== 'undefined'
        ? getCurrentPortalPath(window.location)
        : '/';
  return buildPortalAuthHref('/login-required', target);
}

/** Navigate to login; returns true so callers can early-return. */
export function redirectToPortalLogin(
  router: PortalRouterLike,
  returnTo?: string | null,
): true {
  router.push(buildPortalLoginHref(returnTo));
  return true;
}

/** Navigate to login-required interstitial; returns true so callers can early-return. */
export function redirectToPortalLoginRequired(
  router: PortalRouterLike,
  returnTo?: string | null,
): true {
  router.push(buildPortalLoginRequiredHref(returnTo));
  return true;
}
