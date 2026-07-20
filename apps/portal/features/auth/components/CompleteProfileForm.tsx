'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION } from '@fresh-prints/shared/constants/portal/portalBiddingAcknowledgment.constants';
import { buildPortalBiddingAcknowledgmentSignupCopy } from '@fresh-prints/shared/utils/portalBiddingAcknowledgmentCopy';

import { useAuth } from '../context/AuthContext';
import { needsPortalCustomerProfileCompletion } from '../types/auth.types';
import { buildPortalAuthHref, getPortalReturnToFromSearch, resolvePortalPostAuthPath } from '../utils/portalReturnUrl';
import { UserPlusIcon } from '../../shared/components/PortalIcons';
import { PortalBiddingAcknowledgmentModal } from '../../shared/components/PortalBiddingAcknowledgmentModal';
import { AuthBusyOverlay } from './AuthBusyOverlay';

const SETUP_PROGRESS_MESSAGES = [
  'Creating your customer account…',
  'Reserving your username…',
  'Linking your Google sign-in…',
  'Finishing portal setup…',
] as const;

interface PendingProfile {
  displayName: string;
  username: string;
}

export function CompleteProfileForm() {
  const router = useRouter();
  const {
    bootstrapStatus,
    clearAuthError,
    completeCustomerProfile,
    error,
    firebaseUser,
    isAuthActionLoading,
    isAuthenticated,
    isInitialBootstrap,
    logout,
  } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>(SETUP_PROGRESS_MESSAGES[0]);
  const [pendingProfile, setPendingProfile] = useState<PendingProfile | null>(null);
  const signupCopy = useMemo(() => buildPortalBiddingAcknowledgmentSignupCopy(), []);

  useEffect(() => {
    clearAuthError();
  }, [clearAuthError]);

  useEffect(() => {
    if (firebaseUser?.displayName && !displayName) {
      setDisplayName(firebaseUser.displayName);
    }
  }, [displayName, firebaseUser?.displayName]);

  useEffect(() => {
    if (isInitialBootstrap || bootstrapStatus === 'initializing' || bootstrapStatus === 'loading-profile') {
      return;
    }

    const returnTo = resolvePortalPostAuthPath(
      getPortalReturnToFromSearch(window.location.search),
    );
    if (isAuthenticated && !isSubmitting) {
      router.replace(returnTo);
      return;
    }

    if (bootstrapStatus === 'unauthenticated') {
      router.replace(buildPortalAuthHref('/login', returnTo));
    }
  }, [bootstrapStatus, isAuthenticated, isInitialBootstrap, isSubmitting, router]);

  useEffect(() => {
    if (!isSubmitting) {
      return;
    }

    let step = 0;
    const intervalId = window.setInterval(() => {
      step = Math.min(step + 1, SETUP_PROGRESS_MESSAGES.length - 1);
      setProgressMessage(SETUP_PROGRESS_MESSAGES[step]);
    }, 2200);

    return () => window.clearInterval(intervalId);
  }, [isSubmitting]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    const formData = new FormData(event.currentTarget);
    const nextDisplayName = String(formData.get('displayName') ?? '').trim();
    const username = String(formData.get('username') ?? '').trim();

    if (!nextDisplayName) {
      setLocalError('Enter a display name.');
      return;
    }

    setPendingProfile({ displayName: nextDisplayName, username });
  }

  async function handleAcknowledgeAndComplete() {
    if (!pendingProfile) {
      return;
    }

    const profile = pendingProfile;
    // Busy overlay first so the page never looks idle after checkbox confirm.
    setIsSubmitting(true);
    setProgressMessage(SETUP_PROGRESS_MESSAGES[0]);
    setPendingProfile(null);

    try {
      await completeCustomerProfile(
        {
          displayName: profile.displayName,
          username: profile.username,
          biddingAcknowledgmentAccepted: true,
          biddingAcknowledgmentVersion: PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION,
        },
        {
          onProgress: (message) => {
            setProgressMessage(message);
          },
        },
      );
      setProgressMessage('Opening your portal…');
      router.replace(getPortalReturnToFromSearch(window.location.search));
    } catch {
      setIsSubmitting(false);
    }
  }

  const isBusy = isSubmitting || isAuthActionLoading;

  if (isInitialBootstrap || bootstrapStatus === 'initializing' || bootstrapStatus === 'loading-profile') {
    if (!isBusy) {
      return <p className="portal-muted">Loading your account…</p>;
    }

    return (
      <div className="portal-complete-profile">
        <AuthBusyOverlay message="This may take a moment." title="Setting up your account…" />
      </div>
    );
  }

  if (!needsPortalCustomerProfileCompletion(bootstrapStatus) && !isAuthenticated && !isBusy) {
    return <p className="portal-muted">Redirecting…</p>;
  }

  const displayError = localError ?? error;

  return (
    <div className="portal-complete-profile">
      <form className="portal-auth-form" onSubmit={handleSubmit}>
        <p className="portal-muted">
          Signed in as <strong>{firebaseUser?.email ?? 'your Google account'}</strong>. Choose a
          username to finish setting up your portal account.
        </p>

        <label className="portal-field">
          <span>Display name</span>
          <input
            autoComplete="name"
            disabled={isBusy}
            name="displayName"
            onChange={(event) => setDisplayName(event.target.value)}
            required
            type="text"
            value={displayName}
          />
        </label>

        <label className="portal-field">
          <span>Username</span>
          <input
            autoComplete="username"
            disabled={isBusy}
            name="username"
            pattern="[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]"
            required
            spellCheck={false}
            type="text"
          />
          <span className="portal-field-hint">Lowercase letters, numbers, underscores, or hyphens.</span>
        </label>

        {displayError && !isBusy ? <p className="portal-form-error">{displayError}</p> : null}

        <button
          className="portal-button portal-button-primary portal-button-leading-icon"
          disabled={isBusy}
          type="submit"
        >
          <UserPlusIcon />
          {isBusy ? 'Setting up…' : 'Continue'}
        </button>

        <button
          className="portal-button portal-button-secondary"
          disabled={isBusy}
          onClick={() => {
            void logout();
          }}
          type="button"
        >
          Use a different account
        </button>
      </form>

      <PortalBiddingAcknowledgmentModal
        confirmLabel="Continue"
        copy={signupCopy}
        isBusy={isBusy}
        isOpen={pendingProfile !== null}
        onCancel={() => {
          if (!isBusy) {
            setPendingProfile(null);
          }
        }}
        onConfirm={() => {
          void handleAcknowledgeAndComplete();
        }}
      />

      {isBusy ? (
        <AuthBusyOverlay message={progressMessage} title="Setting up your account…" />
      ) : null}
    </div>
  );
}
