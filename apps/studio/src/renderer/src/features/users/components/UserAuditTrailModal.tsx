import { useMemo } from "react";
import { X } from "lucide-react";

import { EmptyState } from "../../../shared/components/EmptyState";
import { ErrorState } from "../../../shared/components/ErrorState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { useUserAuditTrail } from "../hooks/useUserAuditTrail";
import type { AuditTrailSubject } from "../types/auditTrail.types";
import {
  buildAuditTrailProfile,
  deriveAuditTrailActivityStats,
} from "../utils/buildAuditTrailProfile";
import { UserAuditTrailProfileCard } from "./UserAuditTrailProfileCard";
import { UserManagementModal } from "./UserManagementModal";

interface UserAuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: AuditTrailSubject | null;
}

function formatAuditTimestamp(value: number): string {
  if (!value) {
    return "Unknown time";
  }

  return new Date(value).toLocaleString();
}

export function UserAuditTrailModal({ isOpen, onClose, subject }: UserAuditTrailModalProps) {
  const { entries, error, isLoading } = useUserAuditTrail(isOpen ? subject : null);

  const profile = useMemo(() => (subject ? buildAuditTrailProfile(subject) : null), [subject]);
  const stats = useMemo(
    () => (subject ? deriveAuditTrailActivityStats(subject, entries) : null),
    [entries, subject],
  );

  if (!isOpen || !subject || !profile || !stats) {
    return null;
  }

  return (
    <UserManagementModal
      ariaLabelledBy="user-audit-trail-title"
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
    >
      <button
        aria-label="Close user info"
        className="icon-button icon-button-md icon-button-ghost user-audit-trail-close"
        onClick={onClose}
        type="button"
      >
        <X aria-hidden="true" size={18} strokeWidth={2.2} />
      </button>

      <UserAuditTrailProfileCard profile={profile} stats={stats} />

      <section aria-labelledby="user-audit-trail-activity-title" className="user-audit-trail-activity">
        <div className="user-audit-trail-activity-header">
          <h3 id="user-audit-trail-activity-title">Recent activity</h3>
          <p>Print requests, show queues, uploads, and other actions tied to this record.</p>
        </div>

        {isLoading ? (
          <div className="user-audit-trail-loading">
            <LoadingSpinner label="Loading user info" />
          </div>
        ) : null}

        {error ? <ErrorState message={error} title="Unable to load user info" /> : null}

        {!isLoading && !error && entries.length === 0 ? (
          <EmptyState message="No activity has been recorded for this record yet." title="No activity" />
        ) : null}

        {!isLoading && !error && entries.length > 0 ? (
          <ol className="user-audit-trail-list">
            {entries.map((entry) => (
              <li className="user-audit-trail-entry" key={entry.id}>
                <div className="user-audit-trail-entry-header">
                  <strong>{entry.label}</strong>
                  <span className="user-audit-trail-entry-time">
                    {formatAuditTimestamp(entry.occurredAtMillis)}
                  </span>
                </div>
                {entry.detail ? <p className="user-audit-trail-entry-detail">{entry.detail}</p> : null}
                {entry.actorLabel ? (
                  <p className="user-audit-trail-entry-actor">By {entry.actorLabel}</p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </UserManagementModal>
  );
}
