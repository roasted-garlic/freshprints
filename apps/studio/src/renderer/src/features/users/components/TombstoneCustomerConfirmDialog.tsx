import { Check, Copy, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { PreviewCustomerAccountDeletionResponse } from "@fresh-prints/shared/types/deletion/deletion.types";
import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import { formatCustomerUsernameForDisplay } from "@fresh-prints/shared/utils/formatCustomerUsernameForDisplay";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { tombstoneCustomerAccountService } from "../services/tombstoneCustomerAccountService";

interface TombstoneCustomerConfirmDialogProps {
  customer: Customer | null;
  isOpen: boolean;
  onCancel: () => void;
  onDeleted: () => void;
}

export function TombstoneCustomerConfirmDialog({
  customer,
  isOpen,
  onCancel,
  onDeleted,
}: TombstoneCustomerConfirmDialogProps) {
  const [preview, setPreview] = useState<PreviewCustomerAccountDeletionResponse | null>(null);
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [phraseCopied, setPhraseCopied] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !customer) {
      return;
    }

    let cancelled = false;
    setConfirmationPhrase("");
    setError(null);
    setPreview(null);
    setIsLoadingPreview(true);

    void tombstoneCustomerAccountService
      .preview(customer.id)
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
              : "Unable to preview customer deletion.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingPreview(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customer, isOpen]);

  const copyPhrase = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tombstoneCustomerAccountService.confirmationPhrase);
      setPhraseCopied(true);
      window.setTimeout(() => setPhraseCopied(false), 1500);
    } catch {
      setPhraseCopied(false);
    }
  }, []);

  if (!isOpen || !customer) {
    return null;
  }

  const phraseMatches =
    confirmationPhrase.trim() === tombstoneCustomerAccountService.confirmationPhrase;
  const canSubmit =
    Boolean(preview) &&
    (preview?.outcome === "tombstone" || preview?.outcome === "already_done") &&
    phraseMatches &&
    !isSubmitting &&
    !isLoadingPreview;

  const usernameLabel = formatCustomerUsernameForDisplay(customer.username, {
    isDeleted: customer.isDeleted === true,
  });

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal
        aria-labelledby="tombstone-customer-title"
        className="modal-panel-lg tombstone-customer-modal"
        role="dialog"
      >
        <ModalHeader>
          <div>
            <p className="eyebrow">Permanent account closure</p>
            <h2 id="tombstone-customer-title">Close Account Permanently?</h2>
          </div>
          <button
            aria-label="Close"
            className="icon-button icon-button-md icon-button-ghost"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>
        <ModalBody className="tombstone-customer-modal-body">
          {isLoadingPreview ? <p>Checking account impact…</p> : null}
          {preview ? (
            <>
              <p className="tombstone-customer-modal-summary">
                <strong>{customer.displayName}</strong> will permanently lose Portal sign-in. History
                is retained and username <strong>{usernameLabel}</strong> stays permanently reserved.
                This cannot be reversed through normal Studio controls.
              </p>
              <dl className="tombstone-customer-impact-grid">
                <div>
                  <dt>Open requests</dt>
                  <dd>{preview.openRequestCount}</dd>
                </div>
                <div>
                  <dt>Historical requests</dt>
                  <dd>{preview.historicalRequestCount}</dd>
                </div>
                <div>
                  <dt>Auth account</dt>
                  <dd>{preview.hasAuthAccount ? "Will be disabled" : "None (guest)"}</dd>
                </div>
              </dl>
            </>
          ) : null}
          <label className="form-field" htmlFor="tombstone-customer-confirm-input">
            <span className="form-label">
              Type{" "}
              <code>{tombstoneCustomerAccountService.confirmationPhrase}</code>{" "}
              <button
                aria-label="Copy confirmation phrase"
                className="icon-button icon-button-sm icon-button-ghost"
                disabled={isSubmitting}
                onClick={(event) => {
                  event.preventDefault();
                  void copyPhrase();
                }}
                type="button"
              >
                {phraseCopied ? (
                  <Check aria-hidden="true" size={15} strokeWidth={2.2} />
                ) : (
                  <Copy aria-hidden="true" size={15} strokeWidth={2.2} />
                )}
              </button>
            </span>
            <input
              autoComplete="off"
              className="form-input"
              disabled={isSubmitting || isLoadingPreview}
              id="tombstone-customer-confirm-input"
              onChange={(event) => setConfirmationPhrase(event.currentTarget.value)}
              spellCheck={false}
              type="text"
              value={confirmationPhrase}
            />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button disabled={isSubmitting} onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() => {
              void (async () => {
                setIsSubmitting(true);
                setError(null);
                try {
                  const result = await tombstoneCustomerAccountService.tombstone(
                    customer.id,
                    confirmationPhrase.trim(),
                  );
                  if (result.outcome === "blocked") {
                    setError(result.blockers?.[0]?.message ?? result.message);
                    return;
                  }
                  onDeleted();
                } catch (submitError: unknown) {
                  setError(
                    submitError instanceof Error
                      ? submitError.message
                      : "Unable to delete the customer account.",
                  );
                } finally {
                  setIsSubmitting(false);
                }
              })();
            }}
            variant="danger"
          >
            {isSubmitting ? "Closing…" : "Close Account Permanently"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
