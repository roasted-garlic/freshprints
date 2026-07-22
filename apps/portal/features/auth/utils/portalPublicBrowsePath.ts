/**
 * Pathnames under `(app)` that guests may browse without a registered portal login.
 * Binding for #13: `/` and `/catalog/**`. Donations require a signed-in portal customer.
 */
export function isPortalPublicBrowsePath(pathname: string | null | undefined): boolean {
  if (!pathname) {
    return false;
  }

  if (pathname === '/') {
    return true;
  }

  return pathname === '/catalog' || pathname.startsWith('/catalog/');
}
