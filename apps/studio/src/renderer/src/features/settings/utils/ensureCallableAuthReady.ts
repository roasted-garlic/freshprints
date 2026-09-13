/**
 * Ensures Firebase Auth has finished initializing and a non-empty ID token is
 * available before a Studio callable that requires Authorization is invoked.
 *
 * Scoped for the Pass 2 experimental toggle path; do not broaden to shared
 * callables without review.
 */

export const CALLABLE_AUTH_REQUIRED_MESSAGE =
  "You must be signed in before changing Pass 2 experimental testing.";

export type CallableAuthUserLike = {
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
};

export type CallableAuthLike = {
  authStateReady: () => Promise<void>;
  currentUser: CallableAuthUserLike | null;
};

/**
 * Wait for Auth readiness, require a current user, and obtain a current ID
 * token so the Firebase callable SDK does not send an empty Authorization header.
 */
export async function ensureCallableAuthReady(
  authInstance: CallableAuthLike,
): Promise<void> {
  await authInstance.authStateReady();

  const user = authInstance.currentUser;
  if (!user) {
    throw new Error(CALLABLE_AUTH_REQUIRED_MESSAGE);
  }

  const idToken = await user.getIdToken();
  if (typeof idToken !== "string" || !idToken.trim()) {
    throw new Error(CALLABLE_AUTH_REQUIRED_MESSAGE);
  }
}
