export interface CurrentRef<T> {
  current: T;
}

/** Longer dwell so customers see the review/submit nudge after adding to Current Request. */
export const SUBMIT_NUDGE_TOAST_DURATION_MS = 8_000;

export const SUBMIT_NUDGE_TOAST_MESSAGE =
  "You're not done yet — review and submit your request when you're ready.";

export const SUBMIT_NUDGE_TOAST_ACTION_LABEL = "Review request";

export function requireCurrentSignedIn<TUser, TRouter>(input: {
  userRef: CurrentRef<TUser | null>;
  routerRef: CurrentRef<TRouter>;
  designId?: string;
  returnTo?: string;
  redirect: (router: TRouter, returnTo?: string) => void;
}): boolean {
  if (input.userRef.current) {
    return true;
  }
  const returnTo =
    input.returnTo ??
    (input.designId
      ? `/catalog?designId=${encodeURIComponent(input.designId)}`
      : undefined);
  input.redirect(input.routerRef.current, returnTo);
  return false;
}

/**
 * After a first-add to Current Request, nudge review/submit instead of Undo.
 * Navigates to the request detail (or /requests if id is unavailable).
 */
export function announceCurrentDesignAdded(input: {
  showSuccessRef: CurrentRef<
    (
      message: string,
      options: {
        action: { label: string; onClick: () => void };
        durationMs?: number;
      },
    ) => void
  >;
  onReviewRequest: () => void;
}): void {
  input.showSuccessRef.current(SUBMIT_NUDGE_TOAST_MESSAGE, {
    durationMs: SUBMIT_NUDGE_TOAST_DURATION_MS,
    action: {
      label: SUBMIT_NUDGE_TOAST_ACTION_LABEL,
      onClick: input.onReviewRequest,
    },
  });
}
