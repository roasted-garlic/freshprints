'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, type FormEvent } from 'react';

import { useAuth } from '../context/AuthContext';
import { needsPortalCustomerProfileCompletion } from '../types/auth.types';
import { UserPlusIcon } from '../../shared/components/PortalIcons';
import { GoogleAuthButton } from './GoogleAuthButton';

export function RegisterForm() {
  const router = useRouter();
  const emailPanelId = useId();
  const {
    bootstrapStatus,
    clearAuthError,
    error,
    firebaseUser,
    isAuthActionLoading,
    isAuthenticated,
    loginWithGoogle,
    register,
  } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    clearAuthError();
    setLocalError(null);
  }, [clearAuthError]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
      return;
    }

    if (needsPortalCustomerProfileCompletion(bootstrapStatus)) {
      router.replace('/complete-profile');
    }
  }, [bootstrapStatus, isAuthenticated, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');
    const displayName = String(formData.get('displayName') ?? '');
    const username = String(formData.get('username') ?? '');

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    await register({ email, password, displayName, username });
  }

  const displayError = localError ?? error;
  const isBusy = isAuthActionLoading || (bootstrapStatus === 'loading-profile' && Boolean(firebaseUser));

  return (
    <div className="portal-auth-stack portal-auth-stack-compact">
      <GoogleAuthButton
        disabled={isBusy}
        isLoading={isAuthActionLoading}
        label="Continue with Google"
        loadingLabel="Connecting…"
        onClick={() => {
          void loginWithGoogle();
        }}
      />

      <p className="portal-muted portal-auth-google-hint">
        Google sign-up asks for a username next.
      </p>

      <div aria-hidden className="portal-auth-divider">
        <span>or</span>
      </div>

      <button
        aria-controls={emailPanelId}
        aria-expanded={showEmailForm}
        className="portal-button portal-button-secondary"
        disabled={isBusy}
        onClick={() => setShowEmailForm((open) => !open)}
        type="button"
      >
        {showEmailForm ? 'Hide email sign-up' : 'Sign up with email'}
      </button>

      {showEmailForm ? (
        <form className="portal-auth-form portal-auth-form-compact" id={emailPanelId} onSubmit={handleSubmit}>
          <label className="portal-field">
            <span>Display name</span>
            <input autoComplete="name" name="displayName" required type="text" />
          </label>

          <label className="portal-field">
            <span>Username</span>
            <input
              autoComplete="username"
              name="username"
              pattern="[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]"
              required
              spellCheck={false}
              type="text"
            />
            <span className="portal-field-hint">Lowercase letters, numbers, underscores, or hyphens.</span>
          </label>

          <label className="portal-field">
            <span>Email</span>
            <input autoComplete="email" name="email" required type="email" />
          </label>

          <label className="portal-field">
            <span>Password</span>
            <input autoComplete="new-password" minLength={6} name="password" required type="password" />
          </label>

          <label className="portal-field">
            <span>Confirm password</span>
            <input
              autoComplete="new-password"
              minLength={6}
              name="confirmPassword"
              required
              type="password"
            />
          </label>

          {displayError ? <p className="portal-form-error">{displayError}</p> : null}

          <button
            className="portal-button portal-button-primary portal-button-leading-icon"
            disabled={isBusy}
            type="submit"
          >
            <UserPlusIcon />
            {isBusy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      ) : null}

      <p className="portal-auth-footer">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
