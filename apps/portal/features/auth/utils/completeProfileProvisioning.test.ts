import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  COMPLETE_PROFILE_PROVISION_TIMEOUT_MS,
  CompleteProfileInProgressError,
  CompleteProfileTimeoutError,
  reportCompleteProfileStage,
  userFacingMessageForCompleteProfileError,
  withCompleteProfileTimeout,
} from './completeProfileProvisioning';

describe('completeProfileProvisioning', () => {
  it('exposes a bounded default timeout', () => {
    assert.equal(COMPLETE_PROFILE_PROVISION_TIMEOUT_MS, 45_000);
  });

  it('resolves when the operation finishes before timeout', async () => {
    const value = await withCompleteProfileTimeout(
      Promise.resolve('ok'),
      () => 'submission_started',
      50,
    );
    assert.equal(value, 'ok');
  });

  it('rejects with CompleteProfileTimeoutError and last stage on hang', async () => {
    await assert.rejects(
      () =>
        withCompleteProfileTimeout(
          new Promise(() => {
            /* never settles */
          }),
          () => 'id_token_started',
          20,
        ),
      (error: unknown) => {
        assert.ok(error instanceof CompleteProfileTimeoutError);
        assert.equal(error.lastStage, 'id_token_started');
        assert.match(error.message, /timed out/i);
        return true;
      },
    );
  });

  it('maps timeout and in-progress errors to safe user-facing messages', () => {
    assert.match(
      userFacingMessageForCompleteProfileError(new CompleteProfileTimeoutError('callable_started')),
      /timed out/i,
    );
    assert.match(
      userFacingMessageForCompleteProfileError(new CompleteProfileInProgressError()),
      /already in progress/i,
    );
    assert.equal(
      userFacingMessageForCompleteProfileError(new Error('Callable failed safely')),
      'Callable failed safely',
    );
    assert.equal(
      userFacingMessageForCompleteProfileError({}),
      'Unable to finish setting up your account.',
    );
  });

  it('reportCompleteProfileStage does not throw without console detail', () => {
    reportCompleteProfileStage('auth_user_confirmed');
    reportCompleteProfileStage('timeout', 'id_token_started');
  });
});
