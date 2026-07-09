import { useEffect, useRef, type RefObject } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";

import { EmptyState } from "../../../shared/components/EmptyState";
import { useStaffInboxContext } from "../context/staffInboxContext";
import { StaffInboxItemRow } from "./StaffInboxItemRow";

const DROPDOWN_PREVIEW_LIMIT = 5;

interface StaffInboxPanelProps {
  panelRef?: RefObject<HTMLElement | null>;
}

export function StaffInboxPanel({ panelRef }: StaffInboxPanelProps) {
  const {
    acknowledgeItem,
    closePanel,
    error,
    openItem,
    openItems,
    warning,
  } = useStaffInboxContext();

  const previewItems = openItems.slice(0, DROPDOWN_PREVIEW_LIMIT);

  return (
    <section
      aria-label="Staff inbox preview"
      className="staff-inbox-panel"
      ref={panelRef}
      role="dialog"
    >
      <header className="staff-inbox-panel-header">
        <h2 className="staff-inbox-panel-title">Inbox</h2>
        <p className="staff-inbox-panel-description">Portal activity at a glance.</p>
      </header>

      {error ? (
        <p className="auth-message auth-message-error staff-inbox-panel-error" role="alert">
          {error}
        </p>
      ) : null}

      {warning ? (
        <p className="auth-message staff-inbox-panel-warning" role="status">
          {warning}
        </p>
      ) : null}

      {previewItems.length === 0 ? (
        <EmptyState message="New portal requests will appear here." title="Inbox clear" />
      ) : (
        <ul className="staff-inbox-item-list staff-inbox-item-list-compact">
          {previewItems.map((item) => (
            <StaffInboxItemRow
              compact
              item={item}
              key={item.id}
              onAcknowledge={acknowledgeItem}
              onOpen={openItem}
            />
          ))}
        </ul>
      )}

      <footer className="staff-inbox-panel-footer">
        <Link className="staff-inbox-panel-view-all" onClick={closePanel} to="/inbox">
          {openItems.length > DROPDOWN_PREVIEW_LIMIT
            ? `View all ${openItems.length} items`
            : "Open full inbox"}
        </Link>
      </footer>
    </section>
  );
}

export function StaffInboxBellButton() {
  const { badgeCounts, closePanel, isEnabled, isPanelOpen, togglePanel } = useStaffInboxContext();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPanelOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        closePanel();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [closePanel, isPanelOpen]);

  if (!isEnabled) {
    return null;
  }

  const openCount = badgeCounts.printRequests;

  return (
    <div className="staff-inbox-bell" ref={containerRef}>
      <button
        aria-expanded={isPanelOpen}
        aria-haspopup="dialog"
        aria-label={openCount > 0 ? `Inbox, ${openCount} open items` : "Inbox"}
        className="staff-inbox-bell-button"
        onClick={togglePanel}
        type="button"
      >
        <Bell aria-hidden="true" size={18} strokeWidth={2} />
        {openCount > 0 ? (
          <span aria-hidden="true" className="staff-inbox-bell-bubble">
            {openCount > 9 ? "9+" : openCount}
          </span>
        ) : null}
      </button>
      {isPanelOpen ? <StaffInboxPanel /> : null}
    </div>
  );
}
