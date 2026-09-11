'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { GetCustomerUploadCatalogPermissionFollowUpResponse } from '@fresh-prints/shared/types/customerUpload/customerUploadCatalogPermission.types';

import { customerNotificationsService } from '../../notifications/services/customerNotificationsService';

interface CustomerUploadCatalogPermissionFollowUpModalProps {
  isOpen: boolean;
  requestToken: string;
  onClose: () => void;
}

export function CustomerUploadCatalogPermissionFollowUpModal({
  isOpen,
  requestToken,
  onClose,
}: CustomerUploadCatalogPermissionFollowUpModalProps) {
  const [context, setContext] = useState<GetCustomerUploadCatalogPermissionFollowUpResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] = useState<'allow' | 'decline' | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen || !requestToken) {
      return;
    }
    let cancelled = false;
    setContext(null);
    setError(null);
    void customerNotificationsService
      .getCatalogPermissionFollowUp(requestToken)
      .then((result) => {
        if (!cancelled) {
          setContext(result);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Unable to load this permission request.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, requestToken]);

  const respond = useCallback(
    async (decision: 'allow' | 'decline') => {
      setPendingDecision(decision);
      setError(null);
      try {
        const result = await customerNotificationsService.respondToCatalogPermissionFollowUp(
          requestToken,
          decision,
        );
        setContext((current) =>
          current
            ? {
                ...current,
                status: result.followUpStatus,
              }
            : current,
        );
      } catch (reason: unknown) {
        setError(reason instanceof Error ? reason.message : 'Unable to save your decision.');
      } finally {
        setPendingDecision(null);
      }
    },
    [requestToken],
  );

  useEffect(() => {
    if (!isOpen || pendingDecision) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)');
      if (!focusable || focusable.length === 0) {
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const initialFocus = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus();
    }, 0);
    return () => {
      window.clearTimeout(initialFocus);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, pendingDecision]);

  if (!isOpen) {
    return null;
  }

  const completed = context?.status === 'approved' || context?.status === 'declined';
  return (
    <div
      aria-labelledby="catalog-permission-follow-up-title"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur"
      onClick={() => {
        if (!pendingDecision) onClose();
      }}
      role="dialog"
    >
      <div
        className="modal-panel portal-confirm-modal"
        onClick={(event) => event.stopPropagation()}
        ref={panelRef}
      >
        <header className="modal-header">
          <h2 id="catalog-permission-follow-up-title">Permission to use your artwork</h2>
        </header>
        <div className="modal-body">
          {error ? <p className="portal-form-error" role="alert">{error}</p> : null}
          {!context && !error ? <p className="portal-muted">Loading permission request…</p> : null}
          {context ? (
            <>
              <p>
                We’d like permission to consider <strong>{context.originalFilename}</strong> for the
                Design Library. This does not publish the artwork or change your print request.
              </p>
              {context.previewUrl ? (
                <img
                  alt={`Preview of ${context.originalFilename}`}
                  className="portal-customer-upload-permission-preview"
                  src={context.previewUrl}
                />
              ) : null}
              {context.printRequestName ? (
                <p className="portal-muted">Linked request: {context.printRequestName}</p>
              ) : null}
              {completed ? (
                <p className="portal-form-success" role="status">
                  {context.status === 'approved'
                    ? 'Thanks. The artwork is back in the staff review queue.'
                    : 'Your choice was saved. The artwork will remain excluded from the Design Library.'}
                </p>
              ) : null}
              {context.status === 'not_requested' ? (
                <p className="portal-muted" role="status">
                  This permission request is no longer available.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
        <footer className="modal-footer">
          <button
            className="portal-button portal-button-secondary"
            disabled={Boolean(pendingDecision)}
            onClick={onClose}
            type="button"
          >
            Close
          </button>
          {!completed && context?.status === 'requested' ? (
            <>
              <button
                className="portal-button portal-button-secondary"
                disabled={Boolean(pendingDecision)}
                onClick={() => void respond('decline')}
                type="button"
              >
                {pendingDecision === 'decline' ? 'Saving…' : 'Decline'}
              </button>
              <button
                className="portal-button portal-button-primary"
                disabled={Boolean(pendingDecision)}
                onClick={() => void respond('allow')}
                type="button"
              >
                {pendingDecision === 'allow' ? 'Saving…' : 'Allow'}
              </button>
            </>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
