'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';

import { PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION } from '@fresh-prints/shared/constants/portal/portalBiddingAcknowledgment.constants';
import { normalizeCustomerUsername } from '@fresh-prints/shared/utils/customerUsername';
import { buildPortalBiddingAcknowledgmentSignupCopy } from '@fresh-prints/shared/utils/portalBiddingAcknowledgmentCopy';

import { useAuth } from '../context/AuthContext';
import { portalAuthService } from '../services/authService';
import { needsPortalCustomerProfileCompletion } from '../types/auth.types';
import {
  buildPortalAuthHref,
  getPortalReturnToFromSearch,
  resolvePortalPostAuthPath,
} from '../utils/portalReturnUrl';
import { PortalBiddingAcknowledgmentModal } from '../../shared/components/PortalBiddingAcknowledgmentModal';
import { UserPlusIcon } from '../../shared/components/PortalIcons';
import { PortalUsernameField, validatePortalUsernameInput } from './PortalUsernameField';
import { AuthBusyOverlay } from './AuthBusyOverlay';
import { GoogleAuthButton } from './GoogleAuthButton';

interface PendingRegistration {
  email: string;
  password: string;
  displayName: string;
  username: string;
}

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
  const [pendingRegistration, setPendingRegistration] = useState<PendingRegistration | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const signupCopy = useMemo(() => buildPortalBiddingAcknowledgmentSignupCopy(), []);

  useEffect(() => {
    clearAuthError();
    setLocalError(null);
  }, [clearAuthError]);

  useEffect(() => {
    void portalAuthService.clearAnonymousGuestSession();
  }, []);

  useEffect(() => {
    if (!error && !localError) {
      return;
    }

    setIsSubmitting(false);
  }, [error, localError]);

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    const usernameError = validatePortalUsernameInput(username);
    if (usernameError) {
      setLocalError(usernameError);
      return;
    }

    setPendingRegistration({
      email,
      password,
      displayName,
      username: normalizeCustomerUsername(username),
    });
  }

  async function handleAcknowledgeAndRegister() {
    if (!pendingRegistration) {
      return;
    }

    const credentials = pendingRegistration;
    // Flip busy before closing the ack modal so the form never looks idle.
    setIsSubmitting(true);
    setPendingRegistration(null);
    await register({
      ...credentials,
      biddingAcknowledgmentAccepted: true,
      biddingAcknowledgmentVersion: PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION,
    });
  }

  async function handleGoogleSignUp() {
    setIsSubmitting(true);
    await loginWithGoogle();
  }

  const displayError = localError ?? error;
  const isBusy =
    isSubmitting ||
    isAuthActionLoading ||
    (bootstrapStatus === 'loading-profile' && Boolean(firebaseUser));

  const loginHref =
    typeof window !== 'undefined'
      ? buildPortalAuthHref('/login', getPortalReturnToFromSearch(window.location.search))
      : '/login';

  return (
    <div className="portal-auth-stack portal-auth-stack-compact">
      <GoogleAuthButton
        disabled={isBusy}
        isLoading={isBusy}
        label="Continue with Google"
        loadingLabel="Creating account…"
        onClick={() => {
          void handleGoogleSignUp();
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
        {showEmailForm ? 'Hide email signup' : 'Signup with email'}
      </button>

      {showEmailForm ? (
        <form className="portal-auth-form portal-auth-form-compact" id={emailPanelId} onSubmit={handleSubmit}>
          <label className="portal-field">
            <span>Display name</span>
            <input autoComplete="name" name="displayName" required type="text" />
          </label>

          <PortalUsernameField />

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
            {isBusy ? 'Signing up…' : 'Signup'}
          </button>
        </form>
      ) : null}

      <p className="portal-auth-footer">
        Already have an account? <Link href={loginHref}>Login</Link>
      </p>

      <PortalBiddingAcknowledgmentModal
        confirmLabel="Signup"
        copy={signupCopy}
        isBusy={isBusy}
        isOpen={pendingRegistration !== null}
        onCancel={() => {
          if (!isBusy) {
            setPendingRegistration(null);
          }
        }}
        onConfirm={() => {
          void handleAcknowledgeAndRegister();
        }}
      />

      {isBusy ? (
        <AuthBusyOverlay
          message="This may take a moment."
          title="Signing you up…"
        />
      ) : null}
    </div>
  );
}
