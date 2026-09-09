/**
 * Floating PortalChrome is only for auth/public pages that have no in-page theme control.
 * Allowlist — not "anything outside app shell" — so new Portal routes do not get a rogue picker.
 */
export function shouldShowFloatingThemeToggle(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/login-required' ||
    pathname === '/complete-profile' ||
    pathname.startsWith('/login/') ||
    pathname.startsWith('/register/')
  );
}
