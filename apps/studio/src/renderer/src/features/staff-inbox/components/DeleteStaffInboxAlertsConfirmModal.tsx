import { X } from "lucide-react";

import type { StaffInboxCompletedItem } from "@fresh-prints/shared/staffInbox/staffInbox.types";

import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";

interface DeleteStaffInboxAlertsConfirmModalProps {
  items: StaffInboxCompletedItem[];
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteStaffInboxAlertsConfirmModal({
  items,
  isOpen,
  onCancel,
  onConfirm,
}: DeleteStaffInboxAlertsConfirmModalProps) {
  if (!isOpen || items.length === 0) {
    return null;
  }

  const isBulk = items.length > 1;
  const title = isBulk ? `Delete ${items.length} completed alerts?` : `Delete "${items[0]?.title}"?`;

  return (
    <div className="modal-overlay modal-overlay-blur">
      <Modal
        aria-labelledby="delete-staff-inbox-alerts-title"
        className="modal-panel modal-panel-md"
        role="dialog"
      >
        <ModalHeader>
          <div>
            <p className="eyebrow">Confirm delete</p>
            <h2 id="delete-staff-inbox-alerts-title">{title}</h2>
          </div>

          <button
            aria-label="Close"
            className="icon-button icon-button-md icon-button-ghost"
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </ModalHeader>
        <ModalBody>
          <p>
            {isBulk
              ? "These completed alerts will be removed from Done history and will not return to Open, even if the underlying queue condition is still active."
              : "This completed alert will be removed from Done history and will not return to Open, even if the underlying queue condition is still active."}
          </p>
          {isBulk ? (
            <ul className="staff-inbox-delete-confirm-list">
              {items.map((item) => (
                <li key={item.id}>{item.title}</li>
              ))}
            </ul>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="danger">
            {isBulk ? `Delete ${items.length} alerts` : "Delete alert"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
