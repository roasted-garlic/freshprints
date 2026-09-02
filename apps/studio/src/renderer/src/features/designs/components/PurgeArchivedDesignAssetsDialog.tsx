import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, X } from "lucide-react";

import { PURGE_ARCHIVED_DESIGN_ASSETS_CONFIRMATION_PHRASE } from "@fresh-prints/shared/types/admin/purgeArchivedDesignAssets.types";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { warmPurgeArchivedDesignAssetsCallable } from "../services/purgeArchivedDesignAssetsService";
import type { Design } from "../types/design.types";

const COPY_FEEDBACK_MS = 2000;

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
}

interface PurgeArchivedDesignAssetsDialogProps {
  activeQueueDesignIds: string[];
  designs: Design[];
  error?: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (input: { confirmActiveQueue: boolean; confirmationPhrase?: string }) => Promise<void> | void;
}

export function PurgeArchivedDesignAssetsDialog({
  activeQueueDesignIds,
  designs,
  error,
  isOpen,
  isSubmitting,
  onCancel,
  onConfirm,
}: PurgeArchivedDesignAssetsDialogProps) {
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [acknowledgeActiveQueue, setAcknowledgeActiveQueue] = useState(false);
  const [phraseCopied, setPhraseCopied] = useState(false);
  const copyResetTimerRef = useRef<number | null>(null);

  const isBulk = designs.length > 1;
  const hasActiveQueue = activeQueueDesignIds.length > 0;

  const titleLabel = useMemo(() => {
    if (designs.length === 1) {
      return designs[0]?.title ?? "design";
    }

    return `${designs.length} designs`;
  }, [designs]);

  useEffect(() => {
    if (!isOpen) {
      setConfirmationPhrase("");
      setAcknowledgeActiveQueue(false);
      setPhraseCopied(false);
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
        copyResetTimerRef.current = null;
      }
      return;
    }
    // Same-service warm for purgeArchivedDesignAssets (failures non-fatal).
    warmPurgeArchivedDesignAssetsCallable();
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  const copyConfirmationPhrase = useCallback(async () => {
    try {
      await copyText(PURGE_ARCHIVED_DESIGN_ASSETS_CONFIRMATION_PHRASE);
      setPhraseCopied(true);
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
      copyResetTimerRef.current = window.setTimeout(() => {
        setPhraseCopied(false);
        copyResetTimerRef.current = null;
      }, COPY_FEEDBACK_MS);
    } catch {
      setPhraseCopied(false);
    }
  }, []);

  if (!isOpen || designs.length === 0) {
    return null;
  }

  const canSubmit =
    !isSubmitting &&
    (!isBulk || confirmationPhrase.trim() === PURGE_ARCHIVED_DESIGN_ASSETS_CONFIRMATION_PHRASE) &&
    (!hasActiveQueue || acknowledgeActiveQueue);

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal
        aria-labelledby="purge-archived-design-assets-title"
        className="modal-panel modal-panel-lg"
        role="dialog"
      >
        <ModalHeader>
          <div>
            <p className="eyebrow">Delete images</p>
            <h2 id="purge-archived-design-assets-title">Delete images for {titleLabel}?</h2>
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
          <p>
            This permanently deletes the <strong>original</strong> and <strong>preview</strong> files from
            storage. The <strong>thumbnail</strong> is kept so print requests and show queues can still show
            what the design was, with a clear “images deleted” state. The design leaves the Archived library
            browse list. This cannot be undone, and the design cannot be restored to the catalog afterward.
          </p>

          {isBulk ? (
            <ul className="purge-archived-design-list">
              {designs.slice(0, 8).map((design) => (
                <li key={design.id}>{design.title}</li>
              ))}
              {designs.length > 8 ? <li>…and {designs.length - 8} more</li> : null}
            </ul>
          ) : null}

          {hasActiveQueue ? (
            <div className="auth-message auth-message-error" role="alert">
              <p>
                {activeQueueDesignIds.length === 1
                  ? "This design is on an active show queue."
                  : `${activeQueueDesignIds.length} selected designs are on an active show queue.`}{" "}
                Gang sheets or production that need the original file may fail after delete.
              </p>
              <label className="studio-checkbox studio-checkbox--danger purge-archived-active-queue-ack">
                <input
                  checked={acknowledgeActiveQueue}
                  disabled={isSubmitting}
                  onChange={(event) => setAcknowledgeActiveQueue(event.target.checked)}
                  type="checkbox"
                />
                <span>I understand — delete images anyway</span>
              </label>
            </div>
          ) : null}

          {isBulk ? (
            <label className="form-field purge-archived-confirm-phrase" htmlFor="purge-archived-design-assets-confirm">
              <span className="purge-archived-confirm-phrase-prompt">
                <span>
                  Type <code>{PURGE_ARCHIVED_DESIGN_ASSETS_CONFIRMATION_PHRASE}</code> to confirm
                </span>
                <button
                  aria-label={
                    phraseCopied
                      ? "Confirmation phrase copied"
                      : `Copy ${PURGE_ARCHIVED_DESIGN_ASSETS_CONFIRMATION_PHRASE}`
                  }
                  className={`icon-button icon-button-sm icon-button-ghost purge-archived-confirm-phrase-copy${phraseCopied ? " is-copied" : ""}`}
                  disabled={isSubmitting}
                  onClick={(event) => {
                    event.preventDefault();
                    void copyConfirmationPhrase();
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
                disabled={isSubmitting}
                id="purge-archived-design-assets-confirm"
                onChange={(event) => setConfirmationPhrase(event.target.value)}
                placeholder={PURGE_ARCHIVED_DESIGN_ASSETS_CONFIRMATION_PHRASE}
                spellCheck={false}
                type="text"
                value={confirmationPhrase}
              />
            </label>
          ) : null}

          {error ? (
            <p className="auth-message auth-message-error" role="alert">
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
            onClick={() =>
              void onConfirm({
                confirmActiveQueue: hasActiveQueue ? acknowledgeActiveQueue : false,
                confirmationPhrase: isBulk ? confirmationPhrase.trim() : undefined,
              })
            }
            variant="danger"
          >
            {isSubmitting ? "Deleting..." : isBulk ? "Delete images" : "Delete images"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
