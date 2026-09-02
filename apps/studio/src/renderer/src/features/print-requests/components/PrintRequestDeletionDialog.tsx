import { Check, Copy, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { PreviewPrintRequestDeletionResponse } from "@fresh-prints/shared/types/deletion/deletion.types";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { printRequestDeletionService } from "../services/printRequestDeletionService";

interface PrintRequestDeletionDialogProps {
  isOpen: boolean;
  printRequestId: string | null;
  printRequestName: string;
  onCancel: () => void;
  onCompleted: (result: { message: string; printRequestId: string; outcome: "deleted" | "archived" }) => void;
}

export function PrintRequestDeletionDialog({
  isOpen,
  printRequestId,
  printRequestName,
  onCancel,
  onCompleted,
}: PrintRequestDeletionDialogProps) {
  const [preview, setPreview] = useState<PreviewPrintRequestDeletionResponse | null>(null);
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [phraseCopied, setPhraseCopied] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !printRequestId) {
      return;
    }
    let cancelled = false;
    setConfirmationPhrase("");
    setError(null);
    setPreview(null);
    setIsLoadingPreview(true);
    // Warm mutate Cloud Run services in parallel with real preview (failures ignored).
    printRequestDeletionService.warmMutateCallables();
    void printRequestDeletionService
      .preview(printRequestId)
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
              : "Unable to preview print request deletion.",
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
  }, [isOpen, printRequestId]);

  const copyPhrase = useCallback(async (phrase: string) => {
    try {
      await navigator.clipboard.writeText(phrase);
      setPhraseCopied(true);
      window.setTimeout(() => setPhraseCopied(false), 1500);
    } catch {
      setPhraseCopied(false);
    }
  }, []);

  if (!isOpen || !printRequestId) {
    return null;
  }

  const isArchive = preview?.outcome === "archive";
  const isHardDelete = preview?.outcome === "allowed_hard_delete";
  const isBlocked = preview?.outcome === "blocked";
  const expectedPhrase = isArchive
    ? printRequestDeletionService.archiveConfirmationPhrase
    : printRequestDeletionService.deleteConfirmationPhrase;
  const phraseMatches = confirmationPhrase.trim() === expectedPhrase;
  const canSubmit = (isArchive || isHardDelete) && phraseMatches && !isSubmitting && !isLoadingPreview;

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal
        aria-labelledby="print-request-deletion-title"
        className="modal-panel modal-panel-md"
        role="dialog"
      >
        <ModalHeader>
          <div>
            <p className="eyebrow">{isArchive ? "Archive print request" : "Delete print request"}</p>
            <h2 id="print-request-deletion-title">{printRequestName}</h2>
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
        <ModalBody>
          {isLoadingPreview ? <p>Checking dependencies…</p> : null}
          {isBlocked && preview ? (
            <div role="alert">
              {preview.blockers.map((blocker) => (
                <p key={blocker.code}>{blocker.message}</p>
              ))}
              {preview.blockers.some((blocker) => blocker.navigateHint === "Show Queue") ? (
                <p>Open Show Queue, remove this request from the show, then try again.</p>
              ) : null}
            </div>
          ) : null}
          {isHardDelete && preview ? (
            <p>
              This permanently deletes the unused request and its {preview.itemCount} line item(s).
              Shared designs and customer uploads are not deleted.
            </p>
          ) : null}
          {isArchive ? (
            <p>
              This request has history and will be archived instead of permanently deleted.
            </p>
          ) : null}
          {(isHardDelete || isArchive) && (
            <label className="form-field" htmlFor="print-request-deletion-confirm">
              <span className="form-label">
                Type <code>{expectedPhrase}</code>{" "}
                <button
                  aria-label="Copy confirmation phrase"
                  className="icon-button icon-button-sm icon-button-ghost"
                  onClick={(event) => {
                    event.preventDefault();
                    void copyPhrase(expectedPhrase);
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
                disabled={isSubmitting}
                id="print-request-deletion-confirm"
                onChange={(event) => setConfirmationPhrase(event.currentTarget.value)}
                spellCheck={false}
                type="text"
                value={confirmationPhrase}
              />
            </label>
          )}
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button disabled={isSubmitting} onClick={onCancel} variant="secondary">
            {isBlocked ? "Close" : "Cancel"}
          </Button>
          {isHardDelete || isArchive ? (
            <Button
              disabled={!canSubmit}
              onClick={() => {
                void (async () => {
                  setIsSubmitting(true);
                  setError(null);
                  try {
                    const result = isArchive
                      ? await printRequestDeletionService.archive(
                          printRequestId,
                          confirmationPhrase.trim(),
                        )
                      : await printRequestDeletionService.deleteEligible(
                          printRequestId,
                          confirmationPhrase.trim(),
                        );
                    if (result.outcome === "blocked") {
                      setError(result.blockers?.[0]?.message ?? result.message);
                      return;
                    }
                    onCompleted({
                      message: result.message,
                      printRequestId,
                      outcome: isArchive ? "archived" : "deleted",
                    });
                  } catch (submitError: unknown) {
                    setError(
                      submitError instanceof Error
                        ? submitError.message
                        : "Unable to process print request deletion.",
                    );
                  } finally {
                    setIsSubmitting(false);
                  }
                })();
              }}
              variant="danger"
            >
              {isSubmitting
                ? isArchive
                  ? "Archiving…"
                  : "Deleting…"
                : isArchive
                  ? "Archive request"
                  : "Delete unused request"}
            </Button>
          ) : null}
        </ModalFooter>
      </Modal>
    </div>
  );
}
