'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import { PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION } from '@fresh-prints/shared/constants/portal/portalBiddingAcknowledgment.constants';
import { normalizeCustomerUsername } from '@fresh-prints/shared/utils/customerUsername';
import { buildPortalBiddingAcknowledgmentSignupCopy } from '@fresh-prints/shared/utils/portalBiddingAcknowledgmentCopy';

import { useAuth } from '../context/AuthContext';
import { needsPortalCustomerProfileCompletion } from '../types/auth.types';
import {
  isCompleteProfileFormInteractive,
  resolveCompleteProfileUiMode,
  shouldShowCompleteProfileProvisionOverlay,
} from '../utils/completeProfileLoadingOwnership';
import { buildPortalAuthHref, getPortalReturnToFromSearch, resolvePortalPostAuthPath } from '../utils/portalReturnUrl';
import { UserPlusIcon } from '../../shared/components/PortalIcons';
import { PortalBiddingAcknowledgmentModal } from '../../shared/components/PortalBiddingAcknowledgmentModal';
import { PortalUsernameField, validatePortalUsernameInput } from './PortalUsernameField';
import { AuthBusyOverlay } from './AuthBusyOverlay';

const SETUP_PROGRESS_MESSAGES = [
  'Creating your customer account…',
  'Verifying your sign-in…',
  'Reserving your username…',
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
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>(SETUP_PROGRESS_MESSAGES[0]);
  const [pendingProfile, setPendingProfile] = useState<PendingProfile | null>(null);
  const [lastAttempt, setLastAttempt] = useState<PendingProfile | null>(null);
  const submitLockRef = useRef(false);
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
    const nextUsername = String(formData.get('username') ?? '').trim();

    if (!nextDisplayName) {
      setLocalError('Enter a display name.');
      return;
    }

    const usernameError = validatePortalUsernameInput(nextUsername);
    if (usernameError) {
      setLocalError(usernameError);
      return;
    }

    const normalizedUsername = normalizeCustomerUsername(nextUsername);
    setUsername(nextUsername);
    setPendingProfile({ displayName: nextDisplayName, username: normalizedUsername });
  }

  async function runCompleteProfile(profile: PendingProfile) {
    if (submitLockRef.current || isSubmitting) {
      setLocalError('Account setup is already in progress.');
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setProgressMessage(SETUP_PROGRESS_MESSAGES[0]);
    setPendingProfile(null);
    setLocalError(null);
    clearAuthError();
    setLastAttempt(profile);

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
    } finally {
      submitLockRef.current = false;
    }
  }

  async function handleAcknowledgeAndComplete() {
    if (!pendingProfile) {
      return;
    }

    await runCompleteProfile(pendingProfile);
  }

  async function handleRetry() {
    if (!lastAttempt) {
      setLocalError('Enter your display name and username, then try again.');
      return;
    }

    await runCompleteProfile(lastAttempt);
  }

  const displayError = localError ?? error;
  const uiMode = resolveCompleteProfileUiMode({
    bootstrapStatus,
    isInitialBootstrap,
    isAuthenticated,
    isSubmitting,
    isAuthActionLoading,
    displayError,
  });
  const showProvisionOverlay = shouldShowCompleteProfileProvisionOverlay(uiMode);
  const formInteractive = isCompleteProfileFormInteractive(uiMode);
  const showTerminalFailure = uiMode === 'terminal-failure';

  if (uiMode === 'bootstrap-loading') {
    return <p className="portal-muted">Loading your account…</p>;
  }

  if (uiMode === 'redirecting' && !needsPortalCustomerProfileCompletion(bootstrapStatus)) {
    return <p className="portal-muted">Redirecting…</p>;
  }

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
            disabled={!formInteractive}
            name="displayName"
            onChange={(event) => setDisplayName(event.target.value)}
            required
            type="text"
            value={displayName}
          />
        </label>

        <PortalUsernameField disabled={!formInteractive} onChange={setUsername} value={username} />

        {showTerminalFailure ? <p className="portal-form-error">{displayError}</p> : null}

        {showTerminalFailure ? (
          <button
            className="portal-button portal-button-primary portal-button-leading-icon"
            onClick={() => {
              void handleRetry();
            }}
            type="button"
          >
            <UserPlusIcon />
            Retry setup
          </button>
        ) : (
          <button
            className="portal-button portal-button-primary portal-button-leading-icon"
            disabled={!formInteractive}
            type="submit"
          >
            <UserPlusIcon />
            Continue
          </button>
        )}

        <button
          className="portal-button portal-button-secondary"
          disabled={false}
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
        isBusy={isSubmitting}
        isOpen={pendingProfile !== null}
        onCancel={() => {
          if (!isSubmitting) {
            setPendingProfile(null);
          }
        }}
        onConfirm={() => {
          void handleAcknowledgeAndComplete();
        }}
      />

      {showProvisionOverlay ? (
        <AuthBusyOverlay
          footer={
            <button
              className="portal-button portal-button-secondary"
              onClick={() => {
                void logout();
              }}
              type="button"
            >
              Use a different account
            </button>
          }
          message={progressMessage}
          title="Setting up your account…"
        />
      ) : null}
    </div>
  );
}
