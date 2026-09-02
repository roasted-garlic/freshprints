import { Check, Copy, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { PreviewHardDeleteCustomerAccountResponse } from "@fresh-prints/shared/types/customer/customerIdentityManagement.types";
import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import { formatCustomerUsernameForDisplay } from "@fresh-prints/shared/utils/formatCustomerUsernameForDisplay";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { customerIdentityManagementService } from "../services/customerIdentityManagementService";

interface HardDeleteCustomerConfirmDialogProps {
  customer: Customer | null;
  isOpen: boolean;
  onCancel: () => void;
  onDeleted: () => void;
}

function formatBlockerCounts(preview: PreviewHardDeleteCustomerAccountResponse): string[] {
  const lines: string[] = [];
  const counts = preview.blockerCounts;

  if (counts.printRequests > 0) {
    lines.push(`Print requests: ${counts.printRequests}`);
  }
  if (counts.showAllocations > 0) {
    lines.push(`Show allocations: ${counts.showAllocations}`);
  }
  if (counts.customerUploads > 0) {
    lines.push(`Uploads: ${counts.customerUploads}`);
  }
  if (counts.designIssueReports > 0) {
    lines.push(`Design issue reports: ${counts.designIssueReports}`);
  }
  if (counts.customRequests > 0) {
    lines.push(`Custom requests: ${counts.customRequests}`);
  }
  if (counts.storageObjects > 0) {
    lines.push(`Stored upload files: ${counts.storageObjects}`);
  }

  return lines;
}

export function HardDeleteCustomerConfirmDialog({
  customer,
  isOpen,
  onCancel,
  onDeleted,
}: HardDeleteCustomerConfirmDialogProps) {
  const [preview, setPreview] = useState<PreviewHardDeleteCustomerAccountResponse | null>(null);
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
    customerIdentityManagementService.warmHardDeleteMutateCallable();

    void customerIdentityManagementService
      .previewHardDelete(customer.id)
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
              : "Unable to preview permanent deletion.",
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
      await navigator.clipboard.writeText(customerIdentityManagementService.hardDeleteConfirmationPhrase);
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
    confirmationPhrase.trim() === customerIdentityManagementService.hardDeleteConfirmationPhrase;
  const canSubmit =
    Boolean(preview) &&
    preview?.outcome === "allowed_hard_delete" &&
    phraseMatches &&
    !isSubmitting &&
    !isLoadingPreview;

  const usernameLabel = formatCustomerUsernameForDisplay(customer.username, {
    isDeleted: customer.isDeleted === true,
  });
  const blockerSummary = preview ? formatBlockerCounts(preview) : [];

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal
        aria-labelledby="hard-delete-customer-title"
        className="modal-panel-lg tombstone-customer-modal"
        role="dialog"
      >
        <ModalHeader>
          <div>
            <p className="eyebrow">Permanent deletion</p>
            <h2 id="hard-delete-customer-title">Delete Account Permanently?</h2>
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
          {isLoadingPreview ? <p>Loading deletion preview…</p> : null}

          {!isLoadingPreview && preview?.outcome === "blocked" ? (
            <>
              <p className="auth-message auth-message-error" role="alert">
                {preview.notes?.[0] ??
                  "This customer has history that must be preserved. Merge or disable instead."}
              </p>
              {blockerSummary.length > 0 ? (
                <dl className="tombstone-customer-impact-grid">
                  {blockerSummary.map((line) => {
                    const [label, value] = line.split(": ");
                    return (
                      <div key={line}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    );
                  })}
                </dl>
              ) : null}
              <ul className="tombstone-customer-blocker-list">
                {preview.blockers.map((blocker) => (
                  <li key={blocker.code}>
                    {blocker.message}
                    {typeof blocker.count === "number" ? ` (${blocker.count})` : ""}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {!isLoadingPreview && preview?.outcome === "allowed_hard_delete" ? (
            <>
              <p className="tombstone-customer-modal-summary">
                <strong>{preview.displayName}</strong> has no business history. The Firebase Auth
                user, customer identity records, and username reservation for{" "}
                <strong>{usernameLabel}</strong> will be removed. This cannot be undone.
              </p>
              <dl className="tombstone-customer-impact-grid">
                <div>
                  <dt>Auth account</dt>
                  <dd>{preview.hasAuthAccount ? "Will be deleted" : "Not linked"}</dd>
                </div>
                <div>
                  <dt>History</dt>
                  <dd>None on record</dd>
                </div>
                <div>
                  <dt>Username</dt>
                  <dd>{usernameLabel}</dd>
                </div>
              </dl>
              {preview.notes?.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </>
          ) : null}

          {!isLoadingPreview && preview?.outcome === "allowed_hard_delete" ? (
            <label className="form-field" htmlFor="hard-delete-customer-confirm-input">
              <span className="form-label">
                Type <code>{customerIdentityManagementService.hardDeleteConfirmationPhrase}</code>{" "}
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
                id="hard-delete-customer-confirm-input"
                onChange={(event) => setConfirmationPhrase(event.currentTarget.value)}
                spellCheck={false}
                type="text"
                value={confirmationPhrase}
              />
            </label>
          ) : null}

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
                if (!preview) {
                  return;
                }

                setIsSubmitting(true);
                setError(null);
                try {
                  const result = await customerIdentityManagementService.hardDelete({
                    customerId: customer.id,
                    confirmationPhrase: confirmationPhrase.trim(),
                    previewId: preview.previewId,
                    previewChecksum: preview.previewChecksum,
                  });
                  if (result.outcome === "blocked") {
                    setError(result.blockers?.[0]?.message ?? result.message);
                    return;
                  }
                  onDeleted();
                } catch (submitError: unknown) {
                  setError(
                    submitError instanceof Error
                      ? submitError.message
                      : "Unable to permanently delete the customer account.",
                  );
                } finally {
                  setIsSubmitting(false);
                }
              })();
            }}
            variant="danger"
          >
            {isSubmitting ? "Deleting…" : "Delete Account Permanently"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
