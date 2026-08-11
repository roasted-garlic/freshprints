'use client';

import { useEffect, useState } from 'react';

import type { PreviewCustomerUploadDeletionResponse } from '@fresh-prints/shared/types/deletion/deletion.types';

import {
  customerUploadService,
  type AccountArtworkKind,
} from '../../customer-uploads/services/customerUploadService';

interface AccountArtworkDeletionDialogProps {
  isOpen: boolean;
  item: { id: string; kind: AccountArtworkKind; title: string } | null;
  onCancel: () => void;
  onCompleted: (result: { kind: AccountArtworkKind; message: string }) => void;
}

export function AccountArtworkDeletionDialog({
  isOpen,
  item,
  onCancel,
  onCompleted,
}: AccountArtworkDeletionDialogProps) {
  const [preview, setPreview] = useState<PreviewCustomerUploadDeletionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !item) {
      return;
    }
    let cancelled = false;
    setPreview(null);
    setError(null);
    setIsLoading(true);
    void customerUploadService
      .previewOwnUploadDeletion(item.id)
      .then((result) => {
        if (!cancelled) {
          setPreview(result);
        }
      })
      .catch((previewError: unknown) => {
        if (!cancelled) {
          setError(
            previewError instanceof Error
              ? previewError.message
              : 'Unable to determine whether this design can be deleted.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, item]);

  if (!isOpen || !item) {
    return null;
  }

  const kindLabel = item.kind === 'donation' ? 'donation' : 'upload';
  const canDelete = preview?.outcome === 'allowed_hard_delete' && !isLoading && !isSubmitting;

  return (
    <div
      aria-labelledby="account-artwork-delete-title"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur"
      onClick={() => {
        if (!isSubmitting) {
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
          <h2 id="account-artwork-delete-title">Delete {kindLabel}?</h2>
        </header>
        <div className="modal-body">
          <p className="portal-confirm-modal-message">
            <strong>{item.title}</strong>
          </p>
          {isLoading ? (
            <p className="portal-muted">Checking whether this design is safe to delete…</p>
          ) : null}
          {preview?.outcome === 'allowed_hard_delete' ? (
            <p className="portal-muted portal-confirm-modal-message">
              This permanently removes the {kindLabel} and its stored files. This cannot be undone.
              {item.kind === 'donation'
                ? ' If it used today’s donate allowance, that slot is returned after deletion succeeds.'
                : ''}
            </p>
          ) : null}
          {preview?.outcome === 'blocked' ? (
            <div role="alert">
              {preview.blockers.map((blocker) => (
                <p key={blocker.code} className="portal-confirm-modal-message">
                  {blocker.message}
                </p>
              ))}
            </div>
          ) : null}
          {preview?.outcome === 'already_done' ? (
            <p className="portal-muted">This design has already been deleted.</p>
          ) : null}
          {error ? (
            <p className="portal-form-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <footer className="modal-footer">
          <button
            className="portal-button portal-button-secondary"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            {preview?.outcome === 'blocked' || preview?.outcome === 'already_done'
              ? 'Close'
              : 'Cancel'}
          </button>
          {preview?.outcome === 'allowed_hard_delete' ? (
            <button
              className="portal-button portal-button-danger"
              disabled={!canDelete}
              onClick={() => {
                if (!canDelete) {
                  return;
                }
                void (async () => {
                  setIsSubmitting(true);
                  setError(null);
                  try {
                    const result = await customerUploadService.deleteOwnUpload(
                      item.id,
                      customerUploadService.confirmationPhrase,
                    );
                    if (result.outcome === 'blocked' || result.outcome === 'failed') {
                      setError(result.blockers?.[0]?.message ?? result.message);
                      return;
                    }
                    onCompleted({ kind: item.kind, message: result.message });
                  } catch (submitError: unknown) {
                    setError(
                      submitError instanceof Error
                        ? submitError.message
                        : 'Unable to delete this design. Please try again.',
                    );
                  } finally {
                    setIsSubmitting(false);
                  }
                })();
              }}
              type="button"
            >
              {isSubmitting ? 'Deleting…' : 'Delete permanently'}
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
