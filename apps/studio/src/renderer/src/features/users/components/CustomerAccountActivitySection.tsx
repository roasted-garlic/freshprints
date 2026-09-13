import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import { Button } from "../../../shared/components/Button";
import { EmptyState } from "../../../shared/components/EmptyState";
import type { AuditTrailEntry } from "../types/auditTrail.types";

interface CustomerAccountActivitySectionProps {
  entries: AuditTrailEntry[];
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}

function formatAuditTimestamp(value: number): string {
  if (!value) {
    return "Unknown time";
  }

  return new Date(value).toLocaleString();
}

export function CustomerAccountActivitySection({
  entries,
  totalCount,
  hasMore,
  isLoading,
  onLoadMore,
}: CustomerAccountActivitySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section aria-labelledby="customer-account-activity-title" className="customer-account-activity">
      <button
        aria-expanded={isExpanded}
        className="customer-account-activity-toggle"
        onClick={() => setIsExpanded((current) => !current)}
        type="button"
      >
        <div className="customer-account-activity-toggle-copy">
          <h3 id="customer-account-activity-title">Account activity</h3>
          <p>
            {totalCount} identity event{totalCount === 1 ? "" : "s"} · username, merge, disable, and
            restore history
          </p>
        </div>
        {isExpanded ? (
          <ChevronUp aria-hidden="true" size={18} strokeWidth={2.2} />
        ) : (
          <ChevronDown aria-hidden="true" size={18} strokeWidth={2.2} />
        )}
      </button>

      {isExpanded ? (
        <div className="customer-account-activity-body">
          {isLoading ? <p>Loading account activity…</p> : null}

          {!isLoading && entries.length === 0 ? (
            <EmptyState
              message="No account lifecycle activity has been recorded for this customer yet."
              title="No account activity"
            />
          ) : null}

          {!isLoading && entries.length > 0 ? (
            <ol className="customer-account-activity-list">
              {entries.map((entry) => (
                <li className="customer-account-activity-entry" key={entry.id}>
                  <div className="customer-account-activity-entry-header">
                    <strong>{entry.label}</strong>
                    <span>{formatAuditTimestamp(entry.occurredAtMillis)}</span>
                  </div>
                  {entry.detail ? <p>{entry.detail}</p> : null}
                  {entry.actorLabel ? <p className="customer-account-activity-entry-actor">By {entry.actorLabel}</p> : null}
                </li>
              ))}
            </ol>
          ) : null}

          {!isLoading && hasMore ? (
            <Button onClick={onLoadMore} size="sm" variant="secondary">
              Load more activity
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
