'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, type FormEvent } from 'react';

import { useAuth } from '../context/AuthContext';
import { needsPortalCustomerProfileCompletion } from '../types/auth.types';
import { LogInIcon } from '../../shared/components/PortalIcons';
import { AuthBusyOverlay } from './AuthBusyOverlay';
import { GoogleAuthButton } from './GoogleAuthButton';

export function LoginForm() {
  const router = useRouter();
  const emailPanelId = useId();
  const {
    bootstrapStatus,
    clearAuthError,
    error,
    firebaseUser,
    isAuthActionLoading,
    isAuthenticated,
    login,
    loginWithGoogle,
  } = useAuth();
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    clearAuthError();
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
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    await login({ email, password });
  }

  // Only treat session load as busy when Firebase already signed someone in.
  // Cancelled Google popups must not leave buttons disabled via a stale loading-profile.
  const isBusy = isAuthActionLoading || (bootstrapStatus === 'loading-profile' && Boolean(firebaseUser));

  return (
    <div className="portal-auth-stack portal-auth-stack-compact">
      <GoogleAuthButton
        disabled={isBusy}
        isLoading={isAuthActionLoading}
        label="Continue with Google"
        loadingLabel="Signing in…"
        onClick={() => {
          void loginWithGoogle();
        }}
      />

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
        {showEmailForm ? 'Hide email sign-in' : 'Sign in with email'}
      </button>

      {showEmailForm ? (
        <form className="portal-auth-form portal-auth-form-compact" id={emailPanelId} onSubmit={handleSubmit}>
          <label className="portal-field">
            <span>Email</span>
            <input autoComplete="email" name="email" required type="email" />
          </label>

          <label className="portal-field">
            <span>Password</span>
            <input autoComplete="current-password" name="password" required type="password" />
          </label>

          {error ? <p className="portal-form-error">{error}</p> : null}

          <button
            className="portal-button portal-button-primary portal-button-leading-icon"
            disabled={isBusy}
            type="submit"
          >
            <LogInIcon />
            {isBusy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      ) : null}

      <p className="portal-auth-footer">
        New here? <Link href="/register">Create an account</Link>
      </p>

      {isBusy ? (
        <AuthBusyOverlay
          message="This may take a moment."
          title="Signing you in…"
        />
      ) : null}
    </div>
  );
}
