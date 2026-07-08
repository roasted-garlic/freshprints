'use client';

import { useEffect } from 'react';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';

import { PlayCircleIcon, PlusCircleIcon, XIcon } from './PortalIcons';

interface PortalWorkingRequestChoiceModalProps {
  continuableRequests: PrintRequest[];
  isCreating: boolean;
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  onStartNew: () => void;
}

export function PortalWorkingRequestChoiceModal({
  continuableRequests,
  isCreating,
  isOpen,
  onClose,
  onContinue,
  onStartNew,
}: PortalWorkingRequestChoiceModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isCreating) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreating, isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const requestCount = continuableRequests.length;
  const singleRequestName =
    requestCount === 1 ? continuableRequests[0]?.name : undefined;

  return (
    <div
      aria-labelledby="portal-working-request-choice-title"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur"
      onClick={() => {
        if (!isCreating) {
          onClose();
        }
      }}
      role="dialog"
    >
      <div
        className="modal-panel portal-confirm-modal portal-working-request-choice-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="portal-working-request-choice-title">Request already in progress</h2>
        </header>
        <div className="modal-body">
          <p className="portal-muted portal-confirm-modal-message">
            {singleRequestName ? (
              <>
                You are already working on <strong>{singleRequestName}</strong>. Continue that
                request or start a new one?
              </>
            ) : (
              <>
                You have {requestCount} print request{requestCount === 1 ? '' : 's'} in progress.
                Continue one of them or start a new request?
              </>
            )}
          </p>
        </div>
        <footer className="modal-footer portal-working-request-choice-footer">
          <button
            className="portal-button portal-button-primary portal-button-leading-icon"
            disabled={isCreating}
            onClick={onContinue}
            type="button"
          >
            <PlayCircleIcon />
            Continue current
          </button>
          <button
            className="portal-button portal-button-secondary portal-button-leading-icon"
            disabled={isCreating}
            onClick={onStartNew}
            type="button"
          >
            <PlusCircleIcon />
            {isCreating ? 'Starting…' : 'Start new request'}
          </button>
          <button
            className="portal-button portal-button-secondary portal-button-leading-icon"
            disabled={isCreating}
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
