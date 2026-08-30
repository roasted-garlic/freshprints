import { useCallback, useEffect, useMemo, useState } from "react";

import type { DesignIssueReport } from "@fresh-prints/shared/designIssueReports/designIssueReport.types";
import type { StaffInboxCompletedItem, StaffInboxItem } from "@fresh-prints/shared/staffInbox/staffInbox.types";

import { EmptyState } from "../../../shared/components/EmptyState";
import { ErrorState } from "../../../shared/components/ErrorState";
import { Button } from "../../../shared/components/Button";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { useShellHeaderConfig } from "../../../shared/hooks/useShellHeaderConfig";
import { StaffInboxAlertSettingsModal } from "../components/StaffInboxAlertSettingsModal";
import { DeleteStaffInboxAlertsConfirmModal } from "../components/DeleteStaffInboxAlertsConfirmModal";
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
  const { user } = useAuth();
  const canDeleteCompletedAlerts = Boolean(
    user && permissionService.canDeleteStaffInboxCompletedAlerts(user),
  );
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
    deleteCompletedAlerts,
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
  const [selectedCompletedIds, setSelectedCompletedIds] = useState<Set<string>>(() => new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);

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

  const allQueueCompletedSelected =
    queueCompletedItems.length > 0 &&
    queueCompletedItems.every((item) => selectedCompletedIds.has(item.id));

  const toggleCompletedSelection = useCallback((itemId: string) => {
    setSelectedCompletedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const toggleSelectAllCompleted = useCallback(() => {
    setSelectedCompletedIds((current) => {
      if (allQueueCompletedSelected) {
        return new Set();
      }
      return new Set(queueCompletedItems.map((item) => item.id));
    });
  }, [allQueueCompletedSelected, queueCompletedItems]);

  const handleDeleteSelectedCompleted = useCallback(() => {
    if (selectedCompletedIds.size === 0) {
      return;
    }

    setPendingDeleteIds([...selectedCompletedIds]);
  }, [selectedCompletedIds]);

  const handleDeleteCompleted = useCallback((itemId: string) => {
    setPendingDeleteIds([itemId]);
  }, []);

  const pendingDeleteItems = useMemo(() => {
    if (!pendingDeleteIds?.length) {
      return [];
    }

    const pendingIdSet = new Set(pendingDeleteIds);
    return queueCompletedItems.filter((item) => pendingIdSet.has(item.id));
  }, [pendingDeleteIds, queueCompletedItems]);

  const closeDeleteConfirmModal = useCallback(() => {
    setPendingDeleteIds(null);
  }, []);

  const confirmDeleteCompleted = useCallback(() => {
    if (!pendingDeleteIds?.length) {
      return;
    }

    deleteCompletedAlerts(pendingDeleteIds);
    setSelectedCompletedIds((current) => {
      const next = new Set(current);
      for (const itemId of pendingDeleteIds) {
        next.delete(itemId);
      }
      return next;
    });
    setPendingDeleteIds(null);
  }, [deleteCompletedAlerts, pendingDeleteIds]);

  useEffect(() => {
    setSelectedCompletedIds((current) => {
      const validIds = new Set(queueCompletedItems.map((item) => item.id));
      const next = new Set([...current].filter((itemId) => validIds.has(itemId)));
      return next.size === current.size ? current : next;
    });
  }, [queueCompletedItems]);

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
                    <div>
                      <h2>Completed alerts</h2>
                      <p>Queue and show-full items marked done by any staff member.</p>
                    </div>
                  </header>
                  {canDeleteCompletedAlerts ? (
                    <div className="staff-inbox-done-list-block">
                      <div className="staff-inbox-done-select-row">
                        <label className="staff-inbox-done-select-all staff-inbox-item-check">
                          <input
                            aria-label="Select all completed alerts"
                            checked={allQueueCompletedSelected}
                            onChange={toggleSelectAllCompleted}
                            type="checkbox"
                          />
                          <span className="staff-inbox-done-select-all-label">Select all</span>
                        </label>
                        <Button
                          disabled={selectedCompletedIds.size === 0}
                          onClick={handleDeleteSelectedCompleted}
                          variant="danger"
                        >
                          Delete selected ({selectedCompletedIds.size})
                        </Button>
                      </div>
                      <ul className="staff-inbox-item-list staff-inbox-page-list">
                        {queueCompletedItems.map((item) => (
                          <StaffInboxItemRow
                            isCompleted
                            isSelectable={canDeleteCompletedAlerts}
                            isSelected={selectedCompletedIds.has(item.id)}
                            item={item}
                            key={item.id}
                            onDelete={canDeleteCompletedAlerts ? handleDeleteCompleted : undefined}
                            onOpen={handleOpenItem}
                            onRestore={restoreItem}
                            onToggleSelect={canDeleteCompletedAlerts ? toggleCompletedSelection : undefined}
                          />
                        ))}
                      </ul>
                    </div>
                  ) : (
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
                  )}
                </section>
              ) : null}
            </>
          )}
        </div>
      )}

      <StaffInboxAlertSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <DeleteStaffInboxAlertsConfirmModal
        isOpen={pendingDeleteItems.length > 0}
        items={pendingDeleteItems}
        onCancel={closeDeleteConfirmModal}
        onConfirm={confirmDeleteCompleted}
      />
      <StaffInboxDesignEditHost designId={editDesignId} onClose={() => setEditDesignId(null)} />
    </main>
  );
}
