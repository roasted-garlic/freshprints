import { useCallback, useMemo, useState } from "react";

import { EmptyState } from "../../../shared/components/EmptyState";
import { ErrorState } from "../../../shared/components/ErrorState";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { StaffInboxAlertSettingsModal } from "../components/StaffInboxAlertSettingsModal";
import { StaffInboxItemRow } from "../components/StaffInboxItemRow";
import { useStaffInboxContext } from "../context/staffInboxContext";

type InboxPageTab = "open" | "done";

export function StaffInboxPage() {
  const {
    acknowledgeItem,
    completedItems,
    error,
    isItemHighlighted,
    openItem,
    openItems,
    restoreItem,
    warning,
  } = useStaffInboxContext();
  const [activeTab, setActiveTab] = useState<InboxPageTab>("open");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  useShellHeaderConfig(
    useMemo(
      () => ({
        title: "Inbox",
        description: "Alerts when portal requests join a show queue or a show queue becomes full.",
        actions: [
          {
            label: "Alert settings",
            onClick: openSettings,
          },
        ],
      }),
      [openSettings],
    ),
  );

  const visibleItems = activeTab === "open" ? openItems : completedItems;

  return (
    <main className="page-layout page-layout-shell staff-inbox-page">
      {error ? <ErrorState message={error} title="Unable to load inbox activity" /> : null}
      {warning ? (
        <p className="auth-message staff-inbox-page-warning" role="status">
          {warning}
        </p>
      ) : null}

      <div className="staff-inbox-page-tabs">
        <button
          className={`staff-inbox-page-tab${activeTab === "open" ? " is-active" : ""}`}
          onClick={() => setActiveTab("open")}
          type="button"
        >
          Open ({openItems.length})
        </button>
        <button
          className={`staff-inbox-page-tab${activeTab === "done" ? " is-active" : ""}`}
          onClick={() => setActiveTab("done")}
          type="button"
        >
          Done ({completedItems.length})
        </button>
      </div>

      {visibleItems.length === 0 ? (
        <EmptyState
          message={
            activeTab === "open"
              ? "You will see alerts here when a portal print request is queued to a show or that show queue becomes full."
              : "Items you check off in the inbox will stay here for reference."
          }
          title={activeTab === "open" ? "Inbox clear" : "No completed items yet"}
        />
      ) : (
        <ul className="staff-inbox-item-list staff-inbox-page-list">
          {visibleItems.map((item) => (
            <StaffInboxItemRow
              isCompleted={activeTab === "done"}
              isHighlighted={activeTab === "open" && isItemHighlighted(item.id)}
              item={item}
              key={item.id}
              onAcknowledge={activeTab === "open" ? acknowledgeItem : undefined}
              onOpen={openItem}
              onRestore={activeTab === "done" ? restoreItem : undefined}
            />
          ))}
        </ul>
      )}

      <StaffInboxAlertSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </main>
  );
}
