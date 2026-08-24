/**
 * Routes that render PortalAppShell (sidebar theme toggle).
 * Floating PortalChrome must stay hidden on these paths.
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
