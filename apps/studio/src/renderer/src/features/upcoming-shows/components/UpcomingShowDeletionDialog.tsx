import { Check, Copy, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { PreviewUpcomingShowDeletionResponse } from "@fresh-prints/shared/types/deletion/deletion.types";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { upcomingShowDeletionService } from "../services/upcomingShowDeletionService";

interface UpcomingShowDeletionDialogProps {
  isOpen: boolean;
  upcomingShowId: string | null;
  showLabel: string;
  onCancel: () => void;
  onCompleted: (message: string) => void;
}

export function UpcomingShowDeletionDialog({
  isOpen,
  upcomingShowId,
  showLabel,
  onCancel,
  onCompleted,
}: UpcomingShowDeletionDialogProps) {
  const [preview, setPreview] = useState<PreviewUpcomingShowDeletionResponse | null>(null);
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [phraseCopied, setPhraseCopied] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !upcomingShowId) {
      return;
    }
    let cancelled = false;
    setConfirmationPhrase("");
    setError(null);
    setPreview(null);
    setIsLoadingPreview(true);
    void upcomingShowDeletionService
      .preview(upcomingShowId)
      .then((result) => {
        if (!cancelled) {
          setPreview(result);
        }
      })
      .catch((previewError: unknown) => {
        if (!cancelled) {
          setError(
            previewError instanceof Error ? previewError.message : "Unable to preview show deletion.",
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
  }, [isOpen, upcomingShowId]);

  const copyPhrase = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(upcomingShowDeletionService.confirmationPhrase);
      setPhraseCopied(true);
      window.setTimeout(() => setPhraseCopied(false), 1500);
    } catch {
      setPhraseCopied(false);
    }
  }, []);

  if (!isOpen || !upcomingShowId) {
    return null;
  }

  const isHardDelete = preview?.outcome === "allowed_hard_delete";
  const isBlocked = preview?.outcome === "blocked";
  const phraseMatches =
    confirmationPhrase.trim() === upcomingShowDeletionService.confirmationPhrase;
  const canSubmit = isHardDelete && phraseMatches && !isSubmitting && !isLoadingPreview;

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal
        aria-labelledby="upcoming-show-deletion-title"
        className="modal-panel modal-panel-md"
        role="dialog"
      >
        <ModalHeader>
          <div>
            <p className="eyebrow">Delete show</p>
            <h2 id="upcoming-show-deletion-title">{showLabel}</h2>
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
          {isBlocked && preview
            ? preview.blockers.map((blocker) => <p key={blocker.code}>{blocker.message}</p>)
            : null}
          {isHardDelete ? (
            <>
              <p>This permanently deletes an empty upcoming show with no allocations.</p>
              <label className="form-field" htmlFor="upcoming-show-deletion-confirm">
                <span className="form-label">
                  Type <code>{upcomingShowDeletionService.confirmationPhrase}</code>{" "}
                  <button
                    aria-label="Copy confirmation phrase"
                    className="icon-button icon-button-sm icon-button-ghost"
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
                  disabled={isSubmitting}
                  id="upcoming-show-deletion-confirm"
                  onChange={(event) => setConfirmationPhrase(event.currentTarget.value)}
                  spellCheck={false}
                  type="text"
                  value={confirmationPhrase}
                />
              </label>
            </>
          ) : null}
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
          {isHardDelete ? (
            <Button
              disabled={!canSubmit}
              onClick={() => {
                void (async () => {
                  setIsSubmitting(true);
                  setError(null);
                  try {
                    const result = await upcomingShowDeletionService.deleteEligible(
                      upcomingShowId,
                      confirmationPhrase.trim(),
                    );
                    if (result.outcome === "blocked") {
                      setError(result.blockers?.[0]?.message ?? result.message);
                      return;
                    }
                    onCompleted(result.message);
                  } catch (submitError: unknown) {
                    setError(
                      submitError instanceof Error
                        ? submitError.message
                        : "Unable to delete the show.",
                    );
                  } finally {
                    setIsSubmitting(false);
                  }
                })();
              }}
              variant="danger"
            >
              {isSubmitting ? "Deleting…" : "Delete empty show"}
            </Button>
          ) : null}
        </ModalFooter>
      </Modal>
    </div>
  );
}
