'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, type FormEvent } from 'react';

import { useAuth } from '../context/AuthContext';
import { portalAuthService } from '../services/authService';
import { needsPortalCustomerProfileCompletion } from '../types/auth.types';
import {
  buildPortalAuthHref,
  getPortalReturnToFromSearch,
  resolvePortalPostAuthPath,
} from '../utils/portalReturnUrl';
import { buildPortalRegisterHref } from '../utils/requirePortalLogin';
import { LogInIcon } from '../../shared/components/PortalIcons';
import { AuthBusyOverlay } from './AuthBusyOverlay';
import { GoogleAuthButton } from './GoogleAuthButton';

export function LoginForm() {
  const router = useRouter();
  const emailPanelId = useId();
  const resetPanelId = useId();
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
  const [showResetForm, setShowResetForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    clearAuthError();
  }, [clearAuthError]);

  useEffect(() => {
    void portalAuthService.clearAnonymousGuestSession();
  }, []);

  useEffect(() => {
    if (!error) {
      return;
    }

    setIsSubmitting(false);
  }, [error]);

  useEffect(() => {
    if (bootstrapStatus === 'loading-profile' || bootstrapStatus === 'initializing') {
      return;
    }

    setIsSubmitting(false);
  }, [bootstrapStatus]);

  useEffect(() => {
    const returnTo = resolvePortalPostAuthPath(
      getPortalReturnToFromSearch(window.location.search),
    );
    if (isAuthenticated) {
      router.replace(returnTo);
      return;
    }

    if (needsPortalCustomerProfileCompletion(bootstrapStatus)) {
      router.replace(buildPortalAuthHref('/complete-profile', returnTo));
    }
  }, [bootstrapStatus, isAuthenticated, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    await login({ email, password });
  }

  async function handleGoogleSignIn() {
    setIsSubmitting(true);
    await loginWithGoogle();
  }

  async function handleResetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsResetting(true);
    setResetError(null);
    setResetMessage(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('resetEmail') ?? '');

    try {
      const message = await portalAuthService.sendPasswordResetEmail(email);
      setResetMessage(message);
    } catch (sendError) {
      setResetError(
        sendError instanceof Error ? sendError.message : 'Unable to send a reset email right now.',
      );
    } finally {
      setIsResetting(false);
    }
  }

  const isBusy =
    isSubmitting ||
    isAuthActionLoading ||
    (bootstrapStatus === 'loading-profile' && Boolean(firebaseUser));

  const showGlobalAuthError = Boolean(error) && !isBusy && !isAuthenticated;

  const registerHref =
    typeof window !== 'undefined'
      ? buildPortalRegisterHref(getPortalReturnToFromSearch(window.location.search))
      : '/register';

  return (
    <div className="portal-auth-stack portal-auth-stack-compact">
      {showGlobalAuthError ? (
        <p className="portal-form-error" role="alert">
          {error}
        </p>
      ) : null}

      <GoogleAuthButton
        disabled={isBusy || isResetting}
        isLoading={isBusy}
        label="Continue with Google"
        loadingLabel="Logging in…"
        onClick={() => {
          void handleGoogleSignIn();
        }}
      />

      <div aria-hidden className="portal-auth-divider">
        <span>or</span>
      </div>

      <button
        aria-controls={emailPanelId}
        aria-expanded={showEmailForm}
        className="portal-button portal-button-secondary"
        disabled={isBusy || isResetting}
        onClick={() => setShowEmailForm((open) => !open)}
        type="button"
      >
        {showEmailForm ? 'Hide email login' : 'Login with email'}
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

          {showGlobalAuthError ? null : error ? <p className="portal-form-error">{error}</p> : null}

          <button
            className="portal-button portal-button-primary portal-button-leading-icon"
            disabled={isBusy || isResetting}
            type="submit"
          >
            <LogInIcon />
            {isBusy ? 'Logging in…' : 'Login'}
          </button>

          <button
            aria-controls={resetPanelId}
            aria-expanded={showResetForm}
            className="portal-button portal-button-ghost portal-auth-forgot-password"
            disabled={isBusy || isResetting}
            onClick={() => {
              setShowResetForm((open) => !open);
              setResetError(null);
              setResetMessage(null);
            }}
            type="button"
          >
            Forgot password?
          </button>
        </form>
      ) : null}

      {showEmailForm && showResetForm ? (
        <form
          className="portal-auth-form portal-auth-form-compact portal-auth-reset-form"
          id={resetPanelId}
          onSubmit={handleResetSubmit}
        >
          <p className="portal-muted">
            Enter your account email. If it matches an account, we&apos;ll send a Firebase password
            reset link.
          </p>
          <label className="portal-field">
            <span>Account email</span>
            <input autoComplete="email" name="resetEmail" required type="email" />
          </label>
          {resetError ? (
            <p className="portal-form-error" role="alert">
              {resetError}
            </p>
          ) : null}
          {resetMessage ? (
            <p className="portal-form-success" role="status">
              {resetMessage}
            </p>
          ) : null}
          <button className="portal-button portal-button-secondary" disabled={isResetting} type="submit">
            {isResetting ? 'Sending…' : 'Send reset email'}
          </button>
        </form>
      ) : null}

      <p className="portal-auth-footer">
        New here? <Link href={registerHref}>Signup</Link>
      </p>

      {isBusy ? (
        <AuthBusyOverlay message="This may take a moment." title="Logging you in…" />
      ) : null}
    </div>
  );
}
