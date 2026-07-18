/**
 * True when the current Portal location covers the notification deep link
 * (pathname equal; every query param from the href present with the same value).
 */
export function locationMatchesNotificationHref(
  pathname: string,
  searchParams: { get(name: string): string | null },
  href: string,
): boolean {
  let url: URL;
  try {
    url = new URL(href, 'http://portal.local');
  } catch {
    return false;
  }

  if (url.pathname !== pathname) {
    return false;
  }

  for (const [key, value] of url.searchParams.entries()) {
    if (searchParams.get(key) !== value) {
      return false;
    }
  }

  return true;
}
