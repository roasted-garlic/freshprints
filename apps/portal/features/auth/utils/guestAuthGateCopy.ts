/**
 * Guest in-shell overlay / login-required lead copy by route.
 */
export function resolveGuestAuthGateLead(pathname: string | null | undefined): string {
  const path = (pathname ?? '').split('?')[0] || '/';

  if (path === '/donate' || path.startsWith('/donate/')) {
    return (
      "Please sign in to donate artwork. An account helps us keep the design library " +
      "healthy and protects everyone from spam or unwanted uploads. Thank you for " +
      "understanding. You're still welcome to browse all designs without an account."
    );
  }

  return (
    "You need an account for this part of Fresh Prints but you're free to browse " +
    'all designs without an account.'
  );
}
