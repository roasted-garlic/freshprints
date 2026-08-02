import { useCallback, useEffect, useMemo, useState } from "react";

import type { DesignIssueReport } from "@fresh-prints/shared/designIssueReports/designIssueReport.types";
import type { StaffInboxCompletedItem, StaffInboxItem } from "@fresh-prints/shared/staffInbox/staffInbox.types";

import { EmptyState } from "../../../shared/components/EmptyState";
import { ErrorState } from "../../../shared/components/ErrorState";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { StaffInboxAlertSettingsModal } from "../components/StaffInboxAlertSettingsModal";
import { StaffInboxDesignEditHost } from "../components/StaffInboxDesignEditHost";
import { useResolvedDesignIssueReports } from "../hooks/useResolvedDesignIssueReports";
import { StaffInboxItemRow } from "../components/StaffInboxItemRow";
import { useStaffInboxContext } from "../context/staffInboxContext";

type InboxPageTab = "open" | "done";

function toResolvedInboxItem(report: DesignIssueReport): StaffInboxCompletedItem {
  return {
    id: `design_issue_report:${report.id}`,
    kind: "design_issue_report",
    title: report.designTitleSnapshot,
    subtitle: report.description,
    occurredAtMillis: report.createdAtMillis,
    acknowledgedAtMillis: report.resolvedAtMillis ?? report.createdAtMillis,
    designIssueReport: report,
  };
}

export function StaffInboxPage() {
  const {
    reports: historyResolvedReports,
    isLoading: isLoadingResolvedReports,
    hasLoaded: hasLoadedResolvedReports,
    error: resolvedReportsError,
    load: loadResolvedReports,
  } = useResolvedDesignIssueReports();
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
  const [editDesignId, setEditDesignId] = useState<string | null>(null);

  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleOpenItem = useCallback(
    (item: StaffInboxItem) => {
      if (item.kind === "design_issue_report" && item.designIssueReport?.designId) {
        setEditDesignId(item.designIssueReport.designId);
        return;
      }
      openItem(item);
    },
    [openItem],
  );

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

  useEffect(() => {
    if (activeTab !== "done" || hasLoadedResolvedReports || isLoadingResolvedReports) {
      return;
    }
    void loadResolvedReports();
  }, [activeTab, hasLoadedResolvedReports, isLoadingResolvedReports, loadResolvedReports]);

  const localResolvedCount = useMemo(
    () => completedItems.filter((item) => item.kind === "design_issue_report").length,
    [completedItems],
  );

  useEffect(() => {
    if (activeTab !== "done" || localResolvedCount === 0) {
      return;
    }
    void loadResolvedReports();
  }, [activeTab, loadResolvedReports, localResolvedCount]);

  const queueCompletedItems = useMemo(
    () => completedItems.filter((item) => item.kind !== "design_issue_report"),
    [completedItems],
  );

  const localResolvedItems = useMemo(
    () => completedItems.filter((item) => item.kind === "design_issue_report"),
    [completedItems],
  );

  const historyResolvedItems = useMemo(() => {
    const localIds = new Set(localResolvedItems.map((item) => item.id));
    return historyResolvedReports
      .map((report) => toResolvedInboxItem(report))
      .filter((item) => !localIds.has(item.id));
  }, [historyResolvedReports, localResolvedItems]);

  const doneDesignReportItems = useMemo(
    () =>
      [...localResolvedItems, ...historyResolvedItems].sort(
        (left, right) => right.acknowledgedAtMillis - left.acknowledgedAtMillis,
      ),
    [historyResolvedItems, localResolvedItems],
  );

  const doneTabCount = queueCompletedItems.length + doneDesignReportItems.length;
  const doneIsEmpty =
    queueCompletedItems.length === 0 &&
    doneDesignReportItems.length === 0 &&
    !isLoadingResolvedReports;

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
          Done ({doneTabCount})
        </button>
      </div>

      {activeTab === "open" ? (
        openItems.length === 0 ? (
          <EmptyState
            message="You will see alerts here when a portal print request is queued to a show, a show queue becomes full, or a customer reports a design issue."
            title="Inbox clear"
          />
        ) : (
          <ul className="staff-inbox-item-list staff-inbox-page-list">
            {openItems.map((item) => (
              <StaffInboxItemRow
                isHighlighted={isItemHighlighted(item.id)}
                item={item}
                key={item.id}
                onAcknowledge={acknowledgeItem}
                onOpen={handleOpenItem}
              />
            ))}
          </ul>
        )
      ) : (
        <div className="staff-inbox-done-panel">
          {resolvedReportsError ? (
            <p className="staff-inbox-done-error" role="alert">
              {resolvedReportsError}
            </p>
          ) : null}

          {isLoadingResolvedReports && doneDesignReportItems.length === 0 ? (
            <p className="staff-inbox-done-loading" role="status">
              Loading resolved reports…
            </p>
          ) : null}

          {doneIsEmpty ? (
            <EmptyState
              message="Resolved design reports and items you check off will appear here."
              title="No completed items yet"
            />
          ) : (
            <>
              {doneDesignReportItems.length > 0 ? (
                <section className="staff-inbox-done-section" aria-label="Resolved design reports">
                  <header className="staff-inbox-done-section-header">
                    <h2>Resolved design reports</h2>
                    <p>Reports marked resolved for staff review history.</p>
                  </header>
                  <ul className="staff-inbox-item-list staff-inbox-page-list">
                    {doneDesignReportItems.map((item) => (
                      <StaffInboxItemRow
                        isCompleted
                        item={item}
                        key={item.id}
                        onOpen={handleOpenItem}
                      />
                    ))}
                  </ul>
                </section>
              ) : null}

              {queueCompletedItems.length > 0 ? (
                <section className="staff-inbox-done-section" aria-label="Completed inbox alerts">
                  <header className="staff-inbox-done-section-header">
                    <h2>Completed alerts</h2>
                    <p>Queue and show-full items you marked done.</p>
                  </header>
                  <ul className="staff-inbox-item-list staff-inbox-page-list">
                    {queueCompletedItems.map((item) => (
                      <StaffInboxItemRow
                        isCompleted
                        item={item}
                        key={item.id}
                        onOpen={handleOpenItem}
                        onRestore={restoreItem}
                      />
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>
      )}

      <StaffInboxAlertSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <StaffInboxDesignEditHost designId={editDesignId} onClose={() => setEditDesignId(null)} />
    </main>
  );
}
