import { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";

import { EmptyState } from "../../../shared/components/EmptyState";
import { getCustomerRequestsPath } from "../constants/customerRequestRoutes";
import {
  AssistedMessagesContext,
  useAssistedMessagesContext,
  type AssistedMessagesInboxItem,
} from "../context/assistedMessagesContext";
import { AssistedMessagesHistoryModal } from "./AssistedMessagesHistoryModal";

const DROPDOWN_PREVIEW_LIMIT = 5;

function formatMessageTime(value: number): string {
  if (!value) {
    return "Unknown time";
  }
  return new Date(value).toLocaleString();
}

function buildPanelPreview(unreadItems: AssistedMessagesInboxItem[]): AssistedMessagesInboxItem[] {
  // Dropdown is unread-only. Never fall back to read items (history owns those).
  return unreadItems.slice(0, DROPDOWN_PREVIEW_LIMIT);
}

function AssistedMessagesPanel() {
  const { closePanel, error, openHistory, openItem, unreadItems } = useAssistedMessagesContext();
  // Pin unread list at panel open so mark-read does not yank the row before navigate/unmount.
  const [preview] = useState(() => buildPanelPreview(unreadItems));

  return (
    <section
      aria-label="Assisted messages preview"
      className="staff-inbox-panel assisted-messages-panel"
      role="dialog"
    >
      <header className="staff-inbox-panel-header">
        <h2 className="staff-inbox-panel-title">Messages</h2>
        <p className="staff-inbox-panel-description">
          Unread customer updates on Assisted Creation requests.
        </p>
      </header>

      {error ? (
        <p className="auth-message auth-message-error staff-inbox-panel-error" role="alert">
          {error}
        </p>
      ) : null}

      {preview.length === 0 ? (
        <EmptyState message="New customer messages will appear here." title="Messages clear" />
      ) : (
        <ul className="staff-inbox-item-list staff-inbox-item-list-compact">
          {preview.map((item) => (
            <AssistedMessagesItemRow item={item} key={item.id} onOpen={openItem} />
          ))}
        </ul>
      )}

      <footer className="staff-inbox-panel-footer assisted-messages-panel-footer">
        <button
          className="staff-inbox-panel-history-link"
          onClick={openHistory}
          type="button"
        >
          Message history
        </button>
        <Link
          className="staff-inbox-panel-view-all"
          onClick={closePanel}
          to={getCustomerRequestsPath({ tab: "assisted" })}
        >
          {unreadItems.length > DROPDOWN_PREVIEW_LIMIT
            ? `View Assisted requests (${unreadItems.length} unread)`
            : "Open Assisted Creation"}
        </Link>
      </footer>
    </section>
  );
}

function AssistedMessagesItemRow({
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

export function AssistedMessagesBellButton() {
  const context = useContext(AssistedMessagesContext);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!context?.isPanelOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        context.closePanel();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [context]);

  if (!context) {
    return null;
  }

  const { isPanelOpen, togglePanel, unreadCount } = context;

  return (
    <>
      <div className="staff-inbox-bell assisted-messages-bell" ref={containerRef}>
        <button
          aria-expanded={isPanelOpen}
          aria-haspopup="dialog"
          aria-label={
            unreadCount > 0 ? `Messages, ${unreadCount} unread` : "Messages"
          }
          className="staff-inbox-bell-button"
          onClick={togglePanel}
          type="button"
        >
          <MessageSquare aria-hidden="true" size={18} strokeWidth={2} />
          {unreadCount > 0 ? (
            <span aria-hidden="true" className="staff-inbox-bell-bubble">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
        {isPanelOpen ? <AssistedMessagesPanel /> : null}
      </div>
      <AssistedMessagesHistoryModal />
    </>
  );
}
