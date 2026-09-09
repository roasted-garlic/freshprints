/**
 * Routes that render PortalAppShell (sidebar + in-page theme toggle).
 * Floating PortalChrome visibility is controlled separately by
 * `shouldShowFloatingThemeToggle` (auth-page allowlist).
 */
export function isPortalAppShellRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/shows' ||
    pathname.startsWith('/shows/') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/catalog') ||
    pathname.startsWith('/share/design') ||
    pathname.startsWith('/help') ||
    pathname.startsWith('/favorites') ||
    pathname.startsWith('/requests') ||
    pathname.startsWith('/donate') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/custom-designs') ||
    pathname.startsWith('/custom-request')
  );
}
