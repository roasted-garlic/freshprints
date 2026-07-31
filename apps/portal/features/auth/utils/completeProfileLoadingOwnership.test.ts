import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CompleteProfileTimeoutError,
  withCompleteProfileTimeout,
} from './completeProfileProvisioning';
import {
  isCompleteProfileFormInteractive,
  resolveAuthActionLoadingAfterBootstrap,
  resolveBootstrapStatusAfterProvisionFailure,
  resolveCompleteProfileUiMode,
  shouldShowCompleteProfileProvisionOverlay,
} from './completeProfileLoadingOwnership';

describe('completeProfileLoadingOwnership — production FAIL regression', () => {
  it('clears auth-action loading for missing-profile and missing-customer', () => {
    assert.equal(resolveAuthActionLoadingAfterBootstrap('missing-profile'), false);
    assert.equal(resolveAuthActionLoadingAfterBootstrap('missing-customer'), false);
    assert.equal(resolveAuthActionLoadingAfterBootstrap('ready'), false);
  });

  it('keeps complete-profile interactive when Google sticky isAuthActionLoading was true', () => {
    const mode = resolveCompleteProfileUiMode({
      bootstrapStatus: 'missing-profile',
      isInitialBootstrap: false,
      isAuthenticated: false,
      isSubmitting: false,
      isAuthActionLoading: true,
      displayError: null,
    });

    assert.equal(mode, 'interactive-form');
    assert.equal(isCompleteProfileFormInteractive(mode), true);
    assert.equal(shouldShowCompleteProfileProvisionOverlay(mode), false);
  });

  it('does not show provision overlay for missing-customer + sticky auth loading', () => {
    const mode = resolveCompleteProfileUiMode({
      bootstrapStatus: 'missing-customer',
      isInitialBootstrap: false,
      isAuthenticated: false,
      isSubmitting: false,
      isAuthActionLoading: true,
      displayError: null,
    });

    assert.equal(shouldShowCompleteProfileProvisionOverlay(mode), false);
    assert.equal(isCompleteProfileFormInteractive(mode), true);
  });

  it('shows provision overlay only after Continue starts submitting', () => {
    const before = resolveCompleteProfileUiMode({
      bootstrapStatus: 'missing-profile',
      isInitialBootstrap: false,
      isAuthenticated: false,
      isSubmitting: false,
      isAuthActionLoading: false,
      displayError: null,
    });
    assert.equal(shouldShowCompleteProfileProvisionOverlay(before), false);

    const after = resolveCompleteProfileUiMode({
      bootstrapStatus: 'missing-profile',
      isInitialBootstrap: false,
      isAuthenticated: false,
      isSubmitting: true,
      isAuthActionLoading: true,
      displayError: null,
    });
    assert.equal(after, 'provisioning');
    assert.equal(shouldShowCompleteProfileProvisionOverlay(after), true);
  });

  it('composed: hung provision times out, clears loading authorities, shows terminal error + retry', async () => {
    let isSubmitting = true;
    let isAuthActionLoading = true;
    let registrationInProgress = true;
    let submitLock = true;
    let displayError: string | null = null;
    let bootstrapStatus: 'missing-profile' | 'loading-profile' = 'loading-profile';

    const hungProvision = new Promise<void>(() => {
      /* never settles — mirrors hung getIdToken / callable */
    });

    await assert.rejects(
      () => withCompleteProfileTimeout(hungProvision, () => 'id_token_started', 25),
      (error: unknown) => error instanceof CompleteProfileTimeoutError,
    );

    // Guaranteed terminal path (mirrors AuthProvider catch + form finally).
    isAuthActionLoading = false;
    registrationInProgress = false;
    isSubmitting = false;
    submitLock = false;
    displayError = 'Account setup timed out. Please try again or use a different account.';
    bootstrapStatus = resolveBootstrapStatusAfterProvisionFailure(
      bootstrapStatus,
      true,
    ) as 'missing-profile';

    const mode = resolveCompleteProfileUiMode({
      bootstrapStatus,
      isInitialBootstrap: false,
      isAuthenticated: false,
      isSubmitting,
      isAuthActionLoading,
      displayError,
    });

    assert.equal(isAuthActionLoading, false);
    assert.equal(isSubmitting, false);
    assert.equal(registrationInProgress, false);
    assert.equal(submitLock, false);
    assert.equal(bootstrapStatus, 'missing-profile');
    assert.equal(mode, 'terminal-failure');
    assert.equal(shouldShowCompleteProfileProvisionOverlay(mode), false);
    assert.equal(isCompleteProfileFormInteractive(mode), true);
    assert.match(displayError, /timed out/i);

    // Retry can reach registerCustomer once; concurrent Continues share the lock.
    let provisionCalls = 0;
    submitLock = false;
    isSubmitting = false;

    async function attemptProvision() {
      if (submitLock || isSubmitting) {
        return;
      }
      submitLock = true;
      isSubmitting = true;
      isAuthActionLoading = true;
      registrationInProgress = true;
      try {
        provisionCalls += 1;
        // Simulate in-flight work so concurrent attempts still see the lock.
        await new Promise((resolve) => setTimeout(resolve, 5));
      } finally {
        isSubmitting = false;
        isAuthActionLoading = false;
        registrationInProgress = false;
        submitLock = false;
      }
    }

    await Promise.all([attemptProvision(), attemptProvision(), attemptProvision()]);
    assert.equal(provisionCalls, 1);

    await attemptProvision();
    assert.equal(provisionCalls, 2);
  });

  it('restores missing-profile after provision failure left loading-profile', () => {
    assert.equal(
      resolveBootstrapStatusAfterProvisionFailure('loading-profile', true),
      'missing-profile',
    );
    assert.equal(
      resolveBootstrapStatusAfterProvisionFailure('missing-customer', true),
      'missing-customer',
    );
    assert.equal(
      resolveBootstrapStatusAfterProvisionFailure('loading-profile', false),
      'unauthenticated',
    );
  });

  it('duplicate Continue while submitting stays blocked (single provision authority)', () => {
    let submitLock = false;
    let isSubmitting = false;
    let calls = 0;

    function continueOnce() {
      if (submitLock || isSubmitting) {
        return;
      }
      submitLock = true;
      isSubmitting = true;
      calls += 1;
    }

    continueOnce();
    continueOnce();
    continueOnce();
    assert.equal(calls, 1);
  });
});
