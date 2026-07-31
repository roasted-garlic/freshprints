/**
 * Complete-profile provisioning stages and timeout helpers.
 * Stage logs must never include tokens, emails, names, UIDs, or usernames.
 */

export const COMPLETE_PROFILE_PROVISION_TIMEOUT_MS = 45_000;

export type CompleteProfileStage =
  | 'submission_started'
  | 'auth_user_confirmed'
  | 'id_token_started'
  | 'id_token_succeeded'
  | 'id_token_failed'
  | 'callable_ref_created'
  | 'callable_started'
  | 'callable_succeeded'
  | 'callable_failed'
  | 'session_reload_started'
  | 'session_reload_succeeded'
  | 'session_reload_failed'
  | 'timeout'
  | 'completed';

export class CompleteProfileTimeoutError extends Error {
  readonly lastStage: CompleteProfileStage;

  constructor(lastStage: CompleteProfileStage) {
    super('Account setup timed out. Please try again or use a different account.');
    this.name = 'CompleteProfileTimeoutError';
    this.lastStage = lastStage;
  }
}

export class CompleteProfileInProgressError extends Error {
  constructor() {
    super('Account setup is already in progress.');
    this.name = 'CompleteProfileInProgressError';
  }
}

/** Sanitized console diagnostics for hosted.app QA — stage codes only. */
export function reportCompleteProfileStage(
  stage: CompleteProfileStage,
  detail?: string,
): void {
  if (typeof console === 'undefined' || typeof console.info !== 'function') {
    return;
  }

  if (detail) {
    console.info('[fp-portal-auth]', stage, detail);
    return;
  }

  console.info('[fp-portal-auth]', stage);
}

export function userFacingMessageForCompleteProfileError(error: unknown): string {
  if (error instanceof CompleteProfileTimeoutError) {
    return error.message;
  }

  if (error instanceof CompleteProfileInProgressError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Unable to finish setting up your account.';
}

export async function withCompleteProfileTimeout<T>(
  operation: Promise<T>,
  getLastStage: () => CompleteProfileStage,
  timeoutMs: number = COMPLETE_PROFILE_PROVISION_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          const lastStage = getLastStage();
          reportCompleteProfileStage('timeout', lastStage);
          reject(new CompleteProfileTimeoutError(lastStage));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
