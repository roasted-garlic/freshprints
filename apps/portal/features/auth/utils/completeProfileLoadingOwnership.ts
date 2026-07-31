/**
 * Complete-profile loading ownership — pure decisions shared by AuthProvider,
 * CompleteProfileForm, and regression tests.
 *
 * Provision overlay may appear only while local submission (`isSubmitting`) is true.
 * Sticky Google `isAuthActionLoading` on missing-profile/missing-customer must not
 * trap the customer behind AuthBusyOverlay.
 */

import {
  needsPortalCustomerProfileCompletion,
  type PortalAuthBootstrapStatus,
} from '../types/auth.types';

export type CompleteProfileUiMode =
  | 'bootstrap-loading'
  | 'interactive-form'
  | 'provisioning'
  | 'terminal-failure'
  | 'redirecting';

/**
 * After session bootstrap resolves, never keep auth-action busy for the expected
 * complete-profile handoff states. Those require an interactive form, not a spinner.
 */
export function resolveAuthActionLoadingAfterBootstrap(
  nextBootstrapStatus: PortalAuthBootstrapStatus,
): boolean {
  if (
    nextBootstrapStatus === 'missing-profile' ||
    nextBootstrapStatus === 'missing-customer'
  ) {
    return false;
  }

  // ready / inactive / staff / error / unauthenticated: not an in-flight auth action
  return false;
}

/**
 * After provision timeout/failure while still signed in, restore a status the
 * complete-profile form can render interactively.
 */
export function resolveBootstrapStatusAfterProvisionFailure(
  currentBootstrapStatus: PortalAuthBootstrapStatus,
  stillSignedIn: boolean,
): PortalAuthBootstrapStatus {
  if (!stillSignedIn) {
    return 'unauthenticated';
  }

  if (needsPortalCustomerProfileCompletion(currentBootstrapStatus)) {
    return currentBootstrapStatus;
  }

  if (currentBootstrapStatus === 'loading-profile') {
    return 'missing-profile';
  }

  return currentBootstrapStatus;
}

export function resolveCompleteProfileUiMode(input: {
  bootstrapStatus: PortalAuthBootstrapStatus;
  isInitialBootstrap: boolean;
  isAuthenticated: boolean;
  isSubmitting: boolean;
  /** Context busy from login/register — must not drive provision overlay alone. */
  isAuthActionLoading: boolean;
  displayError: string | null;
}): CompleteProfileUiMode {
  const {
    bootstrapStatus,
    isInitialBootstrap,
    isAuthenticated,
    isSubmitting,
    displayError,
  } = input;

  // Single provision authority: local submit only.
  if (isSubmitting) {
    return 'provisioning';
  }

  if (displayError) {
    return 'terminal-failure';
  }

  if (
    isInitialBootstrap ||
    bootstrapStatus === 'initializing' ||
    bootstrapStatus === 'loading-profile'
  ) {
    return 'bootstrap-loading';
  }

  if (isAuthenticated) {
    return 'redirecting';
  }

  if (needsPortalCustomerProfileCompletion(bootstrapStatus)) {
    return 'interactive-form';
  }

  if (bootstrapStatus === 'unauthenticated') {
    return 'redirecting';
  }

  return 'redirecting';
}

export function shouldShowCompleteProfileProvisionOverlay(
  mode: CompleteProfileUiMode,
): boolean {
  return mode === 'provisioning';
}

export function isCompleteProfileFormInteractive(mode: CompleteProfileUiMode): boolean {
  return mode === 'interactive-form' || mode === 'terminal-failure';
}
