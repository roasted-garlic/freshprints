/**
 * Whether a URL `q` change should overwrite the controlled catalog search input.
 *
 * Self-authored debounce/`router.replace` echoes set `lastSelfPushedQ` to the URL value.
 * Those echoes must not clobber newer local keystrokes. Genuine Back/Forward or
 * external navigation (URL `q` ≠ last self-push) must apply.
 */
export function shouldApplyCatalogUrlSearchToLocal(input: {
  urlQ: string;
  lastSelfPushedQ: string | null;
}): boolean {
  if (input.lastSelfPushedQ !== null && input.urlQ === input.lastSelfPushedQ) {
    return false;
  }
  return true;
}
