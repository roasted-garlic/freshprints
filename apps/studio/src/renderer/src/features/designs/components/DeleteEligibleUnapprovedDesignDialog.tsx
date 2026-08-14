import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, X } from "lucide-react";

import { DELETE_ELIGIBLE_UNAPPROVED_DESIGN_CONFIRMATION_PHRASE } from "@fresh-prints/shared/types/admin/deleteEligibleUnapprovedDesign.types";
import { isDeleteEligibleUnapprovedDesignStatus } from "@fresh-prints/shared/utils/deleteEligibleUnapprovedDesignValidation";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
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

interface DeleteEligibleUnapprovedDesignDialogProps {
  designs: Design[];
  error?: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (input: { confirmationPhrase: string }) => Promise<void> | void;
}

export function DeleteEligibleUnapprovedDesignDialog({
  designs,
  error,
  isOpen,
  isSubmitting,
  onCancel,
  onConfirm,
}: DeleteEligibleUnapprovedDesignDialogProps) {
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [phraseCopied, setPhraseCopied] = useState(false);
  const copyResetTimerRef = useRef<number | null>(null);

  const ineligible = useMemo(
    () => designs.filter((design) => !isDeleteEligibleUnapprovedDesignStatus(design.status)),
    [designs],
  );

  const titleLabel = useMemo(() => {
    if (designs.length === 1) {
      return designs[0]?.title ?? "design";
    }

    return `${designs.length} designs`;
  }, [designs]);

  useEffect(() => {
    if (!isOpen) {
      setConfirmationPhrase("");
      setPhraseCopied(false);
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
        copyResetTimerRef.current = null;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  const phraseMatches =
    confirmationPhrase.trim() === DELETE_ELIGIBLE_UNAPPROVED_DESIGN_CONFIRMATION_PHRASE;
  const canSubmit =
    designs.length > 0 && ineligible.length === 0 && phraseMatches && !isSubmitting;

  return (
    <div aria-modal="true" className="modal-overlay modal-overlay-blur" role="dialog">
      <Modal aria-labelledby="delete-unapproved-design-title">
        <ModalHeader>
          <div>
            <p className="eyebrow">Owner destructive action</p>
            <h2 id="delete-unapproved-design-title">Permanently delete {titleLabel}?</h2>
          </div>
          <Button
            aria-label="Close"
            disabled={isSubmitting}
            onClick={onCancel}
            size="sm"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" size={16} />
          </Button>
        </ModalHeader>
        <ModalBody>
          <p className="auth-message auth-message-warning" role="status">
            This permanently deletes the Firestore design document and Storage original, thumbnail,
            and preview. Ready / approved catalog designs are never eligible. This cannot be undone.
          </p>

          {ineligible.length > 0 ? (
            <p className="auth-message auth-message-error" role="alert">
              {ineligible.length} selected design(s) are not eligible (status must be imported,
              processing, or rejected). Remove them from the selection first.
            </p>
          ) : null}

          <ul>
            {designs.slice(0, 12).map((design) => (
              <li key={design.id}>
                <strong>{design.title || design.id}</strong>{" "}
                <code>{design.status}</code>
              </li>
            ))}
            {designs.length > 12 ? <li>…and {designs.length - 12} more</li> : null}
          </ul>

          <label className="form-field">
            <span>
              Type <code>{DELETE_ELIGIBLE_UNAPPROVED_DESIGN_CONFIRMATION_PHRASE}</code> to confirm
            </span>
            <div className="form-field-row">
              <input
                autoComplete="off"
                disabled={isSubmitting}
                onChange={(event) => setConfirmationPhrase(event.target.value)}
                spellCheck={false}
                type="text"
                value={confirmationPhrase}
              />
              <Button
                disabled={isSubmitting}
                onClick={async () => {
                  await copyText(DELETE_ELIGIBLE_UNAPPROVED_DESIGN_CONFIRMATION_PHRASE);
                  setPhraseCopied(true);
                  if (copyResetTimerRef.current !== null) {
                    window.clearTimeout(copyResetTimerRef.current);
                  }
                  copyResetTimerRef.current = window.setTimeout(() => {
                    setPhraseCopied(false);
                    copyResetTimerRef.current = null;
                  }, COPY_FEEDBACK_MS);
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                {phraseCopied ? <Check aria-hidden="true" size={14} /> : <Copy aria-hidden="true" size={14} />}
                {phraseCopied ? "Copied" : "Copy"}
              </Button>
            </div>
          </label>

          {error ? (
            <p className="auth-message auth-message-error" role="alert">
              {error}
            </p>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button disabled={isSubmitting} onClick={onCancel} type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() => onConfirm({ confirmationPhrase: confirmationPhrase.trim() })}
            type="button"
            variant="danger"
          >
            {isSubmitting ? "Deleting…" : "Permanently delete"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
