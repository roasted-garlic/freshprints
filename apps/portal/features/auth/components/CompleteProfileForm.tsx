'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { useAuth } from '../context/AuthContext';
import { needsPortalCustomerProfileCompletion } from '../types/auth.types';
import { UserPlusIcon } from '../../shared/components/PortalIcons';

const SETUP_PROGRESS_MESSAGES = [
  'Creating your customer account…',
  'Reserving your username…',
  'Linking your Google sign-in…',
  'Finishing portal setup…',
] as const;

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
  const [progressIndex, setProgressIndex] = useState(0);

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

    if (isAuthenticated && !isSubmitting) {
      router.replace('/');
      return;
    }

    if (bootstrapStatus === 'unauthenticated') {
      router.replace('/login');
    }
  }, [bootstrapStatus, isAuthenticated, isInitialBootstrap, isSubmitting, router]);

  useEffect(() => {
    if (!isSubmitting) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setProgressIndex((current) => {
        const next = Math.min(current + 1, SETUP_PROGRESS_MESSAGES.length - 1);
        setProgressMessage(SETUP_PROGRESS_MESSAGES[next]);
        return next;
      });
    }, 2200);

    return () => window.clearInterval(intervalId);
  }, [isSubmitting]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    const formData = new FormData(event.currentTarget);
    const nextDisplayName = String(formData.get('displayName') ?? '').trim();
    const username = String(formData.get('username') ?? '').trim();

    if (!nextDisplayName) {
      setLocalError('Enter a display name.');
      return;
    }

    setIsSubmitting(true);
    setProgressIndex(0);
    setProgressMessage(SETUP_PROGRESS_MESSAGES[0]);

    try {
      await completeCustomerProfile(
        {
          displayName: nextDisplayName,
          username,
        },
        {
          onProgress: (message) => {
            setProgressMessage(message);
          },
        },
      );
      setProgressMessage('Opening your portal…');
      router.replace('/');
    } catch {
      setIsSubmitting(false);
    }
  }

  if (isInitialBootstrap || bootstrapStatus === 'initializing' || bootstrapStatus === 'loading-profile') {
    if (!isSubmitting) {
      return <p className="portal-muted">Loading your account…</p>;
    }
  }

  if (!needsPortalCustomerProfileCompletion(bootstrapStatus) && !isAuthenticated && !isSubmitting) {
    return <p className="portal-muted">Redirecting…</p>;
  }

  const displayError = localError ?? error;
  const isBusy = isSubmitting || isAuthActionLoading;

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

      {isBusy ? (
        <div
          aria-busy="true"
          aria-live="polite"
          className="portal-auth-processing-overlay"
          role="status"
        >
          <div className="portal-auth-processing-card">
            <span aria-hidden="true" className="portal-loading-spinner portal-auth-processing-spinner" />
            <h2 className="portal-auth-processing-title">Setting up your account</h2>
            <p className="portal-auth-processing-copy">{progressMessage}</p>
            <ol className="portal-auth-processing-steps">
              {SETUP_PROGRESS_MESSAGES.map((message, index) => {
                const isDone = index < progressIndex || progressMessage === 'Opening your portal…';
                const isCurrent = index === progressIndex && progressMessage !== 'Opening your portal…';
                return (
                  <li
                    className={`portal-auth-processing-step${isDone ? ' is-done' : ''}${
                      isCurrent ? ' is-current' : ''
                    }`}
                    key={message}
                  >
                    {message}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      ) : null}
    </div>
  );
}
