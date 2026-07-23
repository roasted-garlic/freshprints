/**
 * Pathnames under `(app)` that guests may browse without a registered portal login.
 * Binding for #13: `/`, `/catalog/**`, `/help`, and canonical design share landings.
 * Donations require a signed-in portal customer.
 */
export function isPortalPublicBrowsePath(pathname: string | null | undefined): boolean {
  if (!pathname) {
    return false;
  }

  if (pathname === '/') {
    return true;
  }

  if (pathname === '/catalog' || pathname.startsWith('/catalog/')) {
    return true;
  }

  if (pathname === '/help' || pathname.startsWith('/help/')) {
    return true;
  }

  return pathname === '/share/design' || pathname.startsWith('/share/design/');
}
