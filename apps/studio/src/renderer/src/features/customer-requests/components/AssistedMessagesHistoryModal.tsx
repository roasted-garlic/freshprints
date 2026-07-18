import { useEffect } from "react";

import { ASSISTED_MESSAGES_HISTORY_LIMIT } from "@fresh-prints/shared/utils/assistedCreationHistory";

import { Button } from "../../../shared/components/Button";
import { EmptyState } from "../../../shared/components/EmptyState";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import {
  useAssistedMessagesContext,
  type AssistedMessagesInboxItem,
} from "../context/assistedMessagesContext";

function formatMessageTime(value: number): string {
  if (!value) {
    return "Unknown time";
  }
  return new Date(value).toLocaleString();
}

function HistoryRow({
  item,
  onOpen,
}: {
  item: AssistedMessagesInboxItem;
  onOpen: (item: AssistedMessagesInboxItem) => void;
}) {
  return (
    <li className="staff-inbox-item staff-inbox-item-compact">
      <button
        className="assisted-messages-item-open"
        onClick={() => onOpen(item)}
        type="button"
      >
        <span className="staff-inbox-item-title-row">
          <strong className="staff-inbox-item-title">{item.customerLabel}</strong>
          <span className="assisted-messages-item-status">{item.statusLabel}</span>
        </span>
        <span className="staff-inbox-item-glance">{item.preview}</span>
        <span className="assisted-messages-item-time">{formatMessageTime(item.atMillis)}</span>
      </button>
    </li>
  );
}

export function AssistedMessagesHistoryModal() {
  const { closeHistory, error, isHistoryOpen, openItem, readItems } = useAssistedMessagesContext();

  useEffect(() => {
    if (!isHistoryOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeHistory();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeHistory, isHistoryOpen]);

  if (!isHistoryOpen) {
    return null;
  }

  return (
    <div
      aria-labelledby="assisted-messages-history-title"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur"
      onClick={closeHistory}
      role="dialog"
    >
      <Modal
        className="assisted-messages-history-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <ModalHeader>
          <h2 id="assisted-messages-history-title">Message history</h2>
        </ModalHeader>

        <ModalBody className="assisted-messages-history-body">
          <p className="assisted-messages-history-caption">
            Cleared customer updates from your last {ASSISTED_MESSAGES_HISTORY_LIMIT} messages.
          </p>

          {error ? (
            <p className="auth-message auth-message-error" role="alert">
              {error}
            </p>
          ) : null}

          {!error && readItems.length === 0 ? (
            <EmptyState
              message="Acked customer messages will appear here."
              title="No cleared messages yet"
            />
          ) : null}

          {readItems.length > 0 ? (
            <ul className="staff-inbox-item-list staff-inbox-item-list-compact assisted-messages-history-list">
              {readItems.map((item) => (
                <HistoryRow item={item} key={item.id} onOpen={openItem} />
              ))}
            </ul>
          ) : null}
        </ModalBody>

        <ModalFooter>
          <Button onClick={closeHistory} type="button" variant="secondary">
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
