'use client';

import { useEffect, useState, type FormEvent } from 'react';

import { PortalUsernameField, validatePortalUsernameInput } from '../../auth/components/PortalUsernameField';
import { useAuth } from '../../auth/context/AuthContext';
import {
  firebaseUserHasGoogleProvider,
  firebaseUserHasPasswordProvider,
  portalAuthService,
} from '../../auth/services/authService';
import { usePortalToast } from '../../shared/context/PortalToastContext';
import { usePortalNotifications } from '../../notifications/context/PortalNotificationsProvider';
import { portalAccountSettingsService } from '../services/portalAccountSettingsService';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Reopen this modal after returning from Notifications (nested hub). */
  onReopen?: () => void;
}

type SettingsSection = 'menu' | 'profile' | 'password' | 'email' | 'deletion';

export function AccountSettingsModal({ isOpen, onClose, onReopen }: AccountSettingsModalProps) {
  const { customer, firebaseUser, refreshCustomer, user } = useAuth();
  const { openNotificationSettings } = usePortalNotifications();
  const { showSuccess } = usePortalToast();
  const [section, setSection] = useState<SettingsSection>('menu');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');

  const hasPassword = firebaseUserHasPasswordProvider(firebaseUser);
  const hasGoogle = firebaseUserHasGoogleProvider(firebaseUser);
  const deletionPending = customer?.accountDeletionRequest?.status === 'pending';
  const profileEmail = user?.email ?? customer?.email ?? firebaseUser?.email ?? '';

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setSection('menu');
    setError(null);
    setInfo(null);
    setDisplayName(customer?.displayName ?? '');
    setUsername(customer?.username ?? '');
  }, [customer?.displayName, customer?.username, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) {
        if (section !== 'menu') {
          setSection('menu');
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBusy, isOpen, onClose, section]);

  if (!isOpen) {
    return null;
  }

  async function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedDisplayName = displayName.trim();
    if (trimmedDisplayName.length < 2) {
      setError('Display name must be at least 2 characters.');
      return;
    }

    const usernameError = validatePortalUsernameInput(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    setIsBusy(true);
    setError(null);
    setInfo(null);

    try {
      const result = await portalAccountSettingsService.updateCustomerProfile({
        displayName: trimmedDisplayName,
        username,
      });

      await refreshCustomer();

      let successMessage = 'Profile updated.';
      if (result.usernameChanged) {
        successMessage =
          'Your profile username was updated. Historical print request names (for example, your old username-CR001) stay unchanged.';
      }

      if (!result.propagationComplete) {
        successMessage +=
          ' Some historical records are still updating — this usually finishes within a moment.';
      }

      showSuccess(successMessage);
      setInfo(successMessage);
      setSection('menu');
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : 'Unable to update profile.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSendResetEmail() {
    if (!profileEmail) {
      setError('No email is available on this account.');
      return;
    }
    setIsBusy(true);
    setError(null);
    setInfo(null);
    try {
      const message = await portalAuthService.sendPasswordResetEmail(profileEmail);
      setInfo(message);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send reset email.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firebaseUser) {
      return;
    }
    const formData = new FormData(event.currentTarget);
    const currentPassword = String(formData.get('currentPassword') ?? '');
    const newPassword = String(formData.get('newPassword') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setIsBusy(true);
    setError(null);
    setInfo(null);
    try {
      await portalAuthService.reauthenticateWithPassword(firebaseUser, currentPassword);
      await portalAuthService.updatePassword(firebaseUser, newPassword);
      showSuccess('Password updated.');
      setSection('menu');
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Unable to update password.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleChangeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firebaseUser) {
      return;
    }
    const formData = new FormData(event.currentTarget);
    const currentPassword = String(formData.get('currentPassword') ?? '');
    const newEmail = String(formData.get('newEmail') ?? '').trim();

    setIsBusy(true);
    setError(null);
    setInfo(null);
    try {
      await portalAuthService.reauthenticateWithPassword(firebaseUser, currentPassword);
      await portalAuthService.verifyBeforeUpdateEmail(firebaseUser, newEmail);
      setInfo(
        'Check the new email inbox and confirm the link. Then return here and tap Sync email to update your profile.',
      );
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Unable to start email change.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSyncEmail() {
    setIsBusy(true);
    setError(null);
    setInfo(null);
    try {
      const result = await portalAccountSettingsService.syncAccountEmail();
      await refreshCustomer();
      if (result.unchanged) {
        setInfo(`Profile already uses ${result.email}.`);
      } else {
        showSuccess(`Email updated to ${result.email}.`);
        setSection('menu');
      }
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Unable to sync email.');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRequestDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const confirmation = String(formData.get('confirmation') ?? '');

    setIsBusy(true);
    setError(null);
    setInfo(null);
    try {
      const result = await portalAccountSettingsService.requestAccountDeletion(confirmation);
      await refreshCustomer();
      showSuccess(
        result.alreadyPending
          ? 'Deletion request already pending.'
          : 'Account deletion requested. Fresh Prints will review it.',
      );
      setSection('menu');
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to request deletion.',
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCancelDeletion() {
    setIsBusy(true);
    setError(null);
    try {
      await portalAccountSettingsService.cancelAccountDeletionRequest();
      await refreshCustomer();
      showSuccess('Deletion request cancelled.');
    } catch (cancelError) {
      setError(
        cancelError instanceof Error ? cancelError.message : 'Unable to cancel deletion request.',
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div
      aria-labelledby="account-settings-title"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur"
      onClick={() => {
        if (!isBusy) {
          onClose();
        }
      }}
      role="dialog"
    >
      <div className="modal-panel portal-confirm-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <h2 id="account-settings-title">
            {section === 'menu'
              ? 'Account settings'
              : section === 'profile'
                ? 'Profile'
              : section === 'password'
                ? 'Password'
                : section === 'email'
                  ? 'Change email'
                  : 'Delete account'}
          </h2>
        </header>
        <div className="modal-body">
          {section === 'menu' ? (
            <div className="portal-account-settings-menu">
              <p className="portal-muted portal-confirm-modal-message">
                Manage profile, notifications, password, email, and account deletion for{' '}
                {profileEmail || 'your account'}.
              </p>
              {deletionPending ? (
                <p className="portal-account-deletion-banner" role="status">
                  Account deletion requested. You can keep using the Portal until Fresh Prints
                  processes it, or cancel the request below.
                </p>
              ) : null}
              <button
                className="portal-button portal-button-secondary"
                disabled={isBusy}
                onClick={() => {
                  setError(null);
                  setInfo(null);
                  setDisplayName(customer?.displayName ?? '');
                  setUsername(customer?.username ?? '');
                  setSection('profile');
                }}
                type="button"
              >
                Profile
              </button>
              <button
                className="portal-button portal-button-secondary"
                disabled={isBusy}
                onClick={() => {
                  onClose();
                  openNotificationSettings({
                    onBack: onReopen,
                  });
                }}
                type="button"
              >
                Notifications
              </button>
              <button
                className="portal-button portal-button-secondary"
                disabled={isBusy}
                onClick={() => {
                  setError(null);
                  setInfo(null);
                  setSection('password');
                }}
                type="button"
              >
                Password
              </button>
              <button
                className="portal-button portal-button-secondary"
                disabled={isBusy}
                onClick={() => {
                  setError(null);
                  setInfo(null);
                  setSection('email');
                }}
                type="button"
              >
                Change email
              </button>
              {deletionPending ? (
                <button
                  className="portal-button portal-button-secondary"
                  disabled={isBusy}
                  onClick={() => void handleCancelDeletion()}
                  type="button"
                >
                  Cancel deletion request
                </button>
              ) : (
                <button
                  className="portal-button portal-button-danger"
                  disabled={isBusy}
                  onClick={() => {
                    setError(null);
                    setInfo(null);
                    setSection('deletion');
                  }}
                  type="button"
                >
                  Request account deletion
                </button>
              )}
            </div>
          ) : null}

          {section === 'profile' ? (
            <form className="portal-auth-form" onSubmit={handleUpdateProfile}>
              <p className="portal-muted">
                Update how your name appears in Fresh Prints. Changing your username updates future
                requests; existing print request names stay the same.
              </p>
              <label className="portal-field">
                <span>Display name</span>
                <input
                  autoComplete="name"
                  name="displayName"
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                  type="text"
                  value={displayName}
                />
              </label>
              <PortalUsernameField
                disabled={isBusy}
                onChange={setUsername}
                value={username}
              />
              <button className="portal-button portal-button-primary" disabled={isBusy} type="submit">
                {isBusy ? 'Saving…' : 'Save profile'}
              </button>
            </form>
          ) : null}

          {section === 'password' ? (
            <div className="portal-account-settings-section">
              {!hasPassword ? (
                <p className="portal-muted">
                  This account signs in with Google and does not have a password. Use Google account
                  recovery if you need help signing in.
                </p>
              ) : (
                <>
                  <button
                    className="portal-button portal-button-secondary"
                    disabled={isBusy}
                    onClick={() => void handleSendResetEmail()}
                    type="button"
                  >
                    Send password reset email
                  </button>
                  <form className="portal-auth-form" onSubmit={handleChangePassword}>
                    <label className="portal-field">
                      <span>Current password</span>
                      <input
                        autoComplete="current-password"
                        name="currentPassword"
                        required
                        type="password"
                      />
                    </label>
                    <label className="portal-field">
                      <span>New password</span>
                      <input
                        autoComplete="new-password"
                        minLength={6}
                        name="newPassword"
                        required
                        type="password"
                      />
                    </label>
                    <label className="portal-field">
                      <span>Confirm new password</span>
                      <input
                        autoComplete="new-password"
                        minLength={6}
                        name="confirmPassword"
                        required
                        type="password"
                      />
                    </label>
                    <button className="portal-button portal-button-primary" disabled={isBusy} type="submit">
                      {isBusy ? 'Saving…' : 'Update password'}
                    </button>
                  </form>
                </>
              )}
            </div>
          ) : null}

          {section === 'email' ? (
            <div className="portal-account-settings-section">
              {!hasPassword ? (
                <div className="portal-account-settings-google-email">
                  <p className="portal-muted">
                    {hasGoogle
                      ? 'Your Fresh Prints sign-in email is tied to your Google account and cannot be changed in the app.'
                      : 'Email changes require a password sign-in method on this account.'}
                  </p>
                  {hasGoogle ? (
                    <p className="portal-muted">
                      To use a different email, sign out and create a new account with the address
                      you want. If you no longer need this account, use{' '}
                      <strong>Request account deletion</strong> from the settings menu.
                    </p>
                  ) : null}
                </div>
              ) : (
                <>
                  <form className="portal-auth-form" onSubmit={handleChangeEmail}>
                    <p className="portal-muted">
                      Current email: <strong>{profileEmail || '—'}</strong>. We verify the new
                      address before updating your login email.
                    </p>
                    <label className="portal-field">
                      <span>Current password</span>
                      <input
                        autoComplete="current-password"
                        name="currentPassword"
                        required
                        type="password"
                      />
                    </label>
                    <label className="portal-field">
                      <span>New email</span>
                      <input autoComplete="email" name="newEmail" required type="email" />
                    </label>
                    <button
                      className="portal-button portal-button-primary"
                      disabled={isBusy}
                      type="submit"
                    >
                      {isBusy ? 'Sending…' : 'Send verification to new email'}
                    </button>
                  </form>
                  <button
                    className="portal-button portal-button-secondary"
                    disabled={isBusy}
                    onClick={() => void handleSyncEmail()}
                    type="button"
                  >
                    Sync email from sign-in
                  </button>
                </>
              )}
            </div>
          ) : null}

          {section === 'deletion' ? (
            <form className="portal-auth-form" onSubmit={handleRequestDeletion}>
              <p className="portal-muted">
                This submits a <strong>request</strong> — it does not wipe your account immediately.
                Fresh Prints reviews deletion requests and removes data separately.
              </p>
              <label className="portal-field">
                <span>Type DELETE to confirm</span>
                <input autoComplete="off" name="confirmation" required type="text" />
              </label>
              <button className="portal-button portal-button-danger" disabled={isBusy} type="submit">
                {isBusy ? 'Submitting…' : 'Request deletion'}
              </button>
            </form>
          ) : null}

          {error ? (
            <p className="auth-message auth-message-error" role="alert">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="auth-message auth-message-success" role="status">
              {info}
            </p>
          ) : null}
        </div>
        <footer className="modal-footer">
          {section !== 'menu' ? (
            <button
              className="portal-button portal-button-secondary"
              disabled={isBusy}
              onClick={() => {
                setError(null);
                setInfo(null);
                setSection('menu');
              }}
              type="button"
            >
              Back
            </button>
          ) : null}
          <button
            className="portal-button portal-button-secondary"
            disabled={isBusy}
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
