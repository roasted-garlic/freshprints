'use client';

import { useEffect } from 'react';

import { ImagePlusIcon, LibraryIcon } from './PortalIcons';

export type PortalStartPrintRequestPath = 'upload' | 'browse';

export type PortalStartPrintRequestStep = 'confirm' | 'choosePath';

interface PortalStartPrintRequestModalProps {
  isCreating: boolean;
  isOpen: boolean;
  onCancel: () => void;
  onChoosePath: (path: PortalStartPrintRequestPath) => void;
  onConfirmStart: () => void;
  step: PortalStartPrintRequestStep;
}

export function PortalStartPrintRequestModal({
  isCreating,
  isOpen,
  onCancel,
  onChoosePath,
  onConfirmStart,
  step,
}: PortalStartPrintRequestModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isCreating) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreating, isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  const title =
    step === 'confirm' ? 'Start a new print request?' : 'How do you want to start?';

  return (
    <div
      aria-labelledby="portal-start-print-request-title"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur"
      onClick={() => {
        if (!isCreating) {
          onCancel();
        }
      }}
      role="dialog"
    >
      <div
        className="modal-panel portal-confirm-modal portal-start-print-request-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="portal-start-print-request-title">{title}</h2>
        </header>

        <div className="modal-body">
          {step === 'confirm' ? (
            <p className="portal-muted portal-confirm-modal-message">
              A print request holds designs from the Design Library, artwork you upload, or both.
              Uploaded artwork stays on your request only — it is not added to the shared Design
              Library. Next you will choose whether to upload or browse first.
            </p>
          ) : (
            <p className="portal-muted portal-confirm-modal-message">
              Pick a starting path. You can always add the other kind of designs later from your
              request.
            </p>
          )}
        </div>

        {step === 'confirm' ? (
          <footer className="modal-footer">
            <button
              className="portal-button portal-button-secondary"
              disabled={isCreating}
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
            <button
              className="portal-button portal-button-primary"
              disabled={isCreating}
              onClick={onConfirmStart}
              type="button"
            >
              Start request
            </button>
          </footer>
        ) : (
          <footer className="modal-footer portal-start-print-request-path-footer">
            <button
              className="portal-button portal-button-primary portal-button-leading-icon"
              disabled={isCreating}
              onClick={() => onChoosePath('upload')}
              type="button"
            >
              <ImagePlusIcon />
              {isCreating ? 'Starting…' : 'Start & upload designs'}
            </button>
            <button
              className="portal-button portal-button-primary portal-button-leading-icon"
              disabled={isCreating}
              onClick={() => onChoosePath('browse')}
              type="button"
            >
              <LibraryIcon />
              {isCreating ? 'Starting…' : 'Start & browse designs'}
            </button>
            <button
              className="portal-button portal-button-secondary"
              disabled={isCreating}
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
