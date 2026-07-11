'use client';

import { useEffect } from 'react';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import type { Timestamp } from 'firebase/firestore';

import { XIcon } from './PortalIcons';

interface PortalPickContinuableRequestModalProps {
  continuableRequests: PrintRequest[];
  designTitle?: string;
  isAdding: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSelectRequest: (printRequestId: string) => void;
}

function formatUpdatedDate(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusLabel(status: PrintRequest['status']): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'editing':
      return 'Editing';
    default:
      return status;
  }
}

export function PortalPickContinuableRequestModal({
  continuableRequests,
  designTitle,
  isAdding,
  isOpen,
  onClose,
  onSelectRequest,
}: PortalPickContinuableRequestModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isAdding) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdding, isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-labelledby="portal-pick-continuable-request-title"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur"
      onClick={() => {
        if (!isAdding) {
          onClose();
        }
      }}
      role="dialog"
    >
      <div
        className="modal-panel portal-confirm-modal portal-pick-continuable-request-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="portal-pick-continuable-request-title">Add to which request?</h2>
        </header>
        <div className="modal-body">
          <p className="portal-muted portal-confirm-modal-message">
            {designTitle ? (
              <>
                Choose which open request should get <strong>{designTitle}</strong>.
              </>
            ) : (
              <>Choose which open request to use.</>
            )}
          </p>

          <ul className="portal-pick-request-list">
            {continuableRequests.map((request) => (
              <li key={request.id}>
                <button
                  className="portal-pick-request-option"
                  disabled={isAdding}
                  onClick={() => onSelectRequest(request.id)}
                  type="button"
                >
                  <span className="portal-pick-request-option-copy">
                    <span className="portal-pick-request-option-name">{request.name}</span>
                    <span className="portal-muted portal-pick-request-option-meta">
                      {getStatusLabel(request.status)} · {request.itemCount} design
                      {request.itemCount === 1 ? '' : 's'} · Updated{' '}
                      {formatUpdatedDate(request.updatedAt)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <footer className="modal-footer portal-pick-continuable-request-footer">
          <button
            className="portal-button portal-button-secondary portal-button-leading-icon"
            disabled={isAdding}
            onClick={onClose}
            type="button"
          >
            <XIcon size={14} />
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}
