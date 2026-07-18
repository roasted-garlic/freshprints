'use client';

import { useEffect } from 'react';

interface PortalConfirmModalProps {
  cancelLabel?: string;
  children: React.ReactNode;
  className?: string;
  confirmDisabled?: boolean;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  isConfirmLoading?: boolean;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}

export function PortalConfirmModal({
  cancelLabel = 'Cancel',
  children,
  className,
  confirmDisabled = false,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  isConfirmLoading = false,
  isOpen,
  onCancel,
  onConfirm,
  title,
}: PortalConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isConfirmLoading) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConfirmLoading, isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  const confirmButtonClass =
    confirmVariant === 'danger'
      ? 'portal-button portal-button-danger'
      : 'portal-button portal-button-primary';

  return (
    <div
      aria-labelledby="portal-confirm-modal-title"
      aria-modal="true"
      className={`modal-overlay modal-overlay-blur${className ? ` ${className}` : ''}`}
      onClick={() => {
        if (!isConfirmLoading) {
          onCancel();
        }
      }}
      role="dialog"
    >
      <div
        className="modal-panel portal-confirm-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="portal-confirm-modal-title">{title}</h2>
        </header>
        <div className="modal-body">{children}</div>
        <footer className="modal-footer">
          <button
            className="portal-button portal-button-secondary"
            disabled={isConfirmLoading}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={confirmButtonClass}
            disabled={isConfirmLoading || confirmDisabled}
            onClick={onConfirm}
            type="button"
          >
            {isConfirmLoading ? 'Please wait…' : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
