import { useState } from "react";

import { Button } from "../../../shared/components/Button";
import { useEtsySuggestionRequests } from "../hooks/useEtsySuggestionRequests";

interface EtsyPendingSuggestionRequestsSectionProps {
  canResolve: boolean;
  onToast: (message: string) => void;
}

export function EtsyPendingSuggestionRequestsSection({
  canResolve,
  onToast,
}: EtsyPendingSuggestionRequestsSectionProps) {
  const { items, isLoading, error, actionError, isMutating, approve, reject } =
    useEtsySuggestionRequests();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleApprove(requestId: string, label: string) {
    setBusyId(requestId);
    try {
      const result = await approve(requestId);
      onToast(
        result.alreadyExisted
          ? `“${label}” was already in the live list. Marked approved.`
          : `Approved “${label}” — it is now in the live suggestion list.`,
      );
    } catch {
      // actionError set in hook
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(requestId: string, label: string) {
    setBusyId(requestId);
    try {
      await reject(requestId);
      onToast(`Rejected “${label}”.`);
    } catch {
      // actionError set in hook
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section
      aria-labelledby="etsy-pending-suggestions-title"
      className="card settings-section customer-requests-pending"
    >
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="etsy-pending-suggestions-title">
          Pending suggestions
        </h2>
        <p className="settings-section-description">
          Customers asked to add a subject or tone helper. Approve to publish it to the live list for
          everyone (shown there with a “From suggestion” badge), or reject to dismiss.
        </p>
      </header>

      {!canResolve ? (
        <p className="settings-section-status">
          Only owners and admins can approve or reject. You can still review the queue.
        </p>
      ) : null}

      {error ? (
        <p className="auth-message auth-message-error" role="alert">
          {error}
        </p>
      ) : null}
      {actionError ? (
        <p className="auth-message auth-message-error" role="alert">
          {actionError}
        </p>
      ) : null}

      {isLoading ? (
        <p className="settings-section-status">Loading pending requests…</p>
      ) : items.length === 0 ? (
        <p className="settings-section-status">No pending suggestion requests.</p>
      ) : (
        <ul className="customer-requests-pending-list">
          {items.map((item) => {
            const rowBusy = isMutating && busyId === item.id;
            return (
              <li className="customer-requests-pending-item" key={item.id}>
                <div className="customer-requests-pending-copy">
                  <span className="customer-requests-pending-label">{item.label}</span>
                  <span className="settings-field-hint">
                    {item.kind === "subject" ? "Subject" : "Tone / style"}
                    {item.kind === "subject" && item.apiToken !== item.label
                      ? ` · token: ${item.apiToken}`
                      : ""}
                    {item.createdAt
                      ? ` · ${item.createdAt.toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}`
                      : ""}
                  </span>
                </div>
                {canResolve ? (
                  <div className="customer-requests-pending-actions">
                    <Button
                      disabled={isMutating}
                      onClick={() => void handleApprove(item.id, item.label)}
                      variant="primary"
                    >
                      {rowBusy ? "Working…" : "Approve"}
                    </Button>
                    <Button
                      disabled={isMutating}
                      onClick={() => void handleReject(item.id, item.label)}
                      variant="secondary"
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
