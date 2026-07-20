'use client';

import { useEffect } from 'react';

export type AssistedAddToRequestProgressPhase =
  | 'preparing'
  | 'adding'
  | 'done'
  | 'error';

export interface AssistedAddToRequestProgressModalProps {
  errorMessage?: string | null;
  isOpen: boolean;
  onDismiss: () => void;
  phase: AssistedAddToRequestProgressPhase;
}

function messageForPhase(
  phase: AssistedAddToRequestProgressPhase,
  errorMessage?: string | null,
): string {
  switch (phase) {
    case 'preparing':
      return 'Preparing and resizing artwork…';
    case 'adding':
      return 'Adding to your request…';
    case 'done':
      return 'Done. Added to your Current Request.';
    case 'error':
      return errorMessage?.trim() || 'Unable to add to request.';
    default:
      return 'Working…';
  }
}

/**
 * Status dialog shown while Assisted Add to Request awaits the callable.
 * Stages are client-timed (honest wait feedback), not live server events.
 */
export function AssistedAddToRequestProgressModal({
  errorMessage = null,
  isOpen,
  onDismiss,
  phase,
}: AssistedAddToRequestProgressModalProps) {
  const isBusy = phase === 'preparing' || phase === 'adding';
  const canDismiss = phase === 'error' || phase === 'done';

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && canDismiss) {
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canDismiss, isOpen, onDismiss]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-busy={isBusy || undefined}
      aria-labelledby="assisted-add-to-request-progress-title"
      aria-live="polite"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur"
      onClick={() => {
        if (canDismiss) {
          onDismiss();
        }
      }}
      role="dialog"
    >
      <div
        className="modal-panel portal-confirm-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="assisted-add-to-request-progress-title">
            {phase === 'error' ? 'Could not add design' : 'Adding to Request'}
          </h2>
        </header>
        <div className="modal-body">
          <p className="portal-muted portal-confirm-modal-message assisted-add-progress-message">
            {messageForPhase(phase, errorMessage)}
          </p>
          {isBusy ? (
            <ol className="assisted-add-progress-steps" aria-hidden="true">
              <li className={phase === 'preparing' ? 'is-current' : 'is-done'}>
                Preparing artwork
              </li>
              <li className={phase === 'adding' ? 'is-current' : phase === 'preparing' ? '' : 'is-done'}>
                Adding to request
              </li>
              <li>Done</li>
            </ol>
          ) : null}
        </div>
        {canDismiss ? (
          <footer className="modal-footer">
            <button
              className="portal-button portal-button-primary"
              onClick={onDismiss}
              type="button"
            >
              {phase === 'done' ? 'OK' : 'Close'}
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
