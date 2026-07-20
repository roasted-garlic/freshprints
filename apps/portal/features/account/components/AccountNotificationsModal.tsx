'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

import { isAssistedProofEmailOptedIn } from '@fresh-prints/shared/utils/assistedCreationHistory';
import { isAssistedBrowserPushOptedIn } from '@fresh-prints/shared/utils/customerNotifications';

import { useAuth } from '../../auth/context/AuthContext';
import {
  enablePortalBrowserPush,
  isPortalBrowserPushEnabled,
} from '../../notifications/services/portalWebPushService';
import { usePortalToast } from '../../shared/context/PortalToastContext';
import { customerNotificationPreferencesService } from '../services/customerNotificationPreferencesService';

interface AccountNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set (e.g. opened from Account settings), shows Back and returns to that hub. */
  onBack?: () => void;
  /** Called after browser push is successfully enabled so Alerts CTA can refresh. */
  onBrowserPushEnabled?: () => void;
}

export function AccountNotificationsModal({
  isOpen,
  onClose,
  onBack,
  onBrowserPushEnabled,
}: AccountNotificationsModalProps) {
  const { customer, refreshCustomer } = useAuth();
  const { showSuccess } = usePortalToast();
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [browserPushOptIn, setBrowserPushOptIn] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [browserPushEnabled, setBrowserPushEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setEmailOptIn(isAssistedProofEmailOptedIn(customer?.assistedProofEmailOptIn));
    setBrowserPushOptIn(isAssistedBrowserPushOptedIn(customer?.assistedBrowserPushOptIn));
    setError(null);
    let cancelled = false;
    void isPortalBrowserPushEnabled().then((enabled) => {
      if (!cancelled) {
        setBrowserPushEnabled(enabled);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [customer?.assistedBrowserPushOptIn, customer?.assistedProofEmailOptIn, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving && !isEnablingPush) {
        if (onBack) {
          onBack();
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEnablingPush, isOpen, isSaving, onBack, onClose]);

  if (!isOpen) {
    return null;
  }

  async function handleSave() {
    if (!customer?.id) {
      setError('Your account profile is not ready yet. Try again in a moment.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await customerNotificationPreferencesService.setNotificationPreferences(customer.id, {
        emailOptIn,
        browserPushOptIn,
      });
      await refreshCustomer();
      onClose();
      showSuccess('Notification preferences saved.');
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save notification preferences right now.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEnableBrowser() {
    const wasEnabled = browserPushEnabled;
    setIsEnablingPush(true);
    setError(null);
    try {
      if (customer?.id && !browserPushOptIn) {
        await customerNotificationPreferencesService.setAssistedBrowserPushOptIn(customer.id, true);
        setBrowserPushOptIn(true);
        await refreshCustomer();
      }
      // Always force-refresh on click (including when UI already looks enabled) so
      // UNREGISTERED / server-disabled tokens can be replaced.
      const result = await enablePortalBrowserPush();
      if (result.ok) {
        setBrowserPushEnabled(true);
        onBrowserPushEnabled?.();
        onClose();
        showSuccess(wasEnabled ? 'Browser alerts refreshed for this device.' : result.message);
      } else {
        setError(result.message);
      }
    } catch (pushError) {
      setError(
        pushError instanceof Error
          ? pushError.message
          : 'Unable to enable browser alerts right now.',
      );
    } finally {
      setIsEnablingPush(false);
    }
  }

  return (
    <div
      aria-labelledby="account-notifications-title"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur"
      onClick={() => {
        if (!isSaving && !isEnablingPush) {
          onClose();
        }
      }}
      role="dialog"
    >
      <div
        className="modal-panel portal-confirm-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="account-notifications-title">Notifications</h2>
        </header>
        <div className="modal-body">
          <p className="portal-muted portal-confirm-modal-message">
            Choose how you hear about proofs and messages on your custom design requests.
          </p>
          <label className="form-checkbox portal-account-notification-option">
            <input
              checked={emailOptIn}
              disabled={isSaving || isEnablingPush}
              onChange={(event) => setEmailOptIn(event.target.checked)}
              type="checkbox"
            />
            <span>
              Email me when a custom design proof is ready for review
              <span className="portal-muted portal-account-notification-hint">
                Sent when Fresh Prints uploads a proof for your Assisted Creation request.
              </span>
            </span>
          </label>
          <label className="form-checkbox portal-account-notification-option">
            <input
              checked={browserPushOptIn}
              disabled={isSaving || isEnablingPush}
              onChange={(event) => setBrowserPushOptIn(event.target.checked)}
              type="checkbox"
            />
            <span>
              Allow browser alerts for proofs and staff messages
              <span className="portal-muted portal-account-notification-hint">
                Works in Chrome, Firefox, and Opera when you enable this browser below. In-app Alerts
                always work while you are signed in.
              </span>
            </span>
          </label>
          <button
            className={`portal-button portal-button-secondary portal-account-enable-push-button${
              browserPushEnabled ? ' is-enabled' : ''
            }`}
            disabled={isSaving || isEnablingPush}
            onClick={() => void handleEnableBrowser()}
            type="button"
          >
            {isEnablingPush ? (
              browserPushEnabled ? (
                'Refreshing…'
              ) : (
                'Enabling…'
              )
            ) : browserPushEnabled ? (
              <>
                <Check aria-hidden size={16} strokeWidth={2.25} />
                Refresh browser alerts
              </>
            ) : (
              'Enable alerts in this browser'
            )}
          </button>
          {error ? (
            <p className="auth-message auth-message-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <footer className="modal-footer">
          {onBack ? (
            <button
              className="portal-button portal-button-secondary"
              disabled={isSaving || isEnablingPush}
              onClick={onBack}
              type="button"
            >
              Back
            </button>
          ) : null}
          <button
            className="portal-button portal-button-secondary"
            disabled={isSaving || isEnablingPush}
            onClick={onClose}
            type="button"
          >
            Close
          </button>
          <button
            className="portal-button portal-button-primary"
            disabled={isSaving || isEnablingPush}
            onClick={() => void handleSave()}
            type="button"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </div>
    </div>
  );
}
