'use client';

import { useEffect, useState } from 'react';

import { isAssistedProofEmailOptedIn } from '@fresh-prints/shared/utils/assistedCreationHistory';

import { useAuth } from '../../auth/context/AuthContext';
import { customerNotificationPreferencesService } from '../services/customerNotificationPreferencesService';

interface AccountNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountNotificationsModal({ isOpen, onClose }: AccountNotificationsModalProps) {
  const { customer, refreshCustomer } = useAuth();
  const [optIn, setOptIn] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setOptIn(isAssistedProofEmailOptedIn(customer?.assistedProofEmailOptIn));
    setError(null);
    setSuccess(null);
  }, [customer?.assistedProofEmailOptIn, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

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
    setSuccess(null);
    try {
      await customerNotificationPreferencesService.setAssistedProofEmailOptIn(customer.id, optIn);
      await refreshCustomer();
      setSuccess('Notification preferences saved.');
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

  return (
    <div
      aria-labelledby="account-notifications-title"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur"
      onClick={() => {
        if (!isSaving) {
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
            Choose which Assisted Creation emails you receive. You can change this anytime.
          </p>
          <label className="form-checkbox portal-account-notification-option">
            <input
              checked={optIn}
              disabled={isSaving}
              onChange={(event) => setOptIn(event.target.checked)}
              type="checkbox"
            />
            <span>
              Email me when a custom design proof is ready for review
              <span className="portal-muted portal-account-notification-hint">
                Sent when Fresh Prints uploads a proof for your Assisted Creation request.
              </span>
            </span>
          </label>
          {error ? (
            <p className="auth-message auth-message-error" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="auth-message auth-message-success" role="status">
              {success}
            </p>
          ) : null}
        </div>
        <footer className="modal-footer">
          <button
            className="portal-button portal-button-secondary"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            Close
          </button>
          <button
            className="portal-button portal-button-primary"
            disabled={isSaving}
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
