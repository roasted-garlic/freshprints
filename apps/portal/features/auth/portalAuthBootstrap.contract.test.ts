import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

describe('Portal auth bootstrap contracts', () => {
  const authProviderSource = readFileSync(
    resolve(import.meta.dirname, "context/AuthProvider.tsx"),
    "utf8",
  );
  const loginFormSource = readFileSync(
    resolve(import.meta.dirname, "components/LoginForm.tsx"),
    "utf8",
  );
  const customerProfileSource = readFileSync(
    resolve(import.meta.dirname, "services/customerProfileService.ts"),
    "utf8",
  );

  it('blocks disabled and tombstoned customers after profile load', () => {
    assert.match(authProviderSource, /customer\.isDisabled === true/);
    assert.match(authProviderSource, /customer\.isDeleted === true/);
  });

  it('times out long-running profile bootstrap', () => {
    assert.match(authProviderSource, /PORTAL_AUTH_BOOTSTRAP_TIMEOUT_MS/);
    assert.match(authProviderSource, /Signing in is taking longer than expected/);
  });

  it('clears login submit busy state after bootstrap resolves', () => {
    assert.match(loginFormSource, /setIsSubmitting\(false\)/);
    assert.match(loginFormSource, /bootstrapStatus === 'loading-profile'/);
  });

  it('maps customer identity fields needed for disabled checks', () => {
    assert.match(customerProfileSource, /readCustomerIdentityDocumentFields/);
    assert.match(customerProfileSource, /disabledAt:/);
  });

  it('preserves blocked-login errors across sign-out and shows them globally on LoginForm', () => {
    assert.match(authProviderSource, /pendingLoginErrorRef/);
    assert.match(authProviderSource, /finalizeBlockedLogin/);
    assert.match(authProviderSource, /PORTAL_ACCOUNT_DISABLED_MESSAGE/);
    assert.match(authProviderSource, /subscribeToUserProfile/);
    assert.match(authProviderSource, /subscribeToCustomerByUserId/);
    assert.match(loginFormSource, /showGlobalAuthError/);
    assert.match(loginFormSource, /role="alert"/);
  });
});
