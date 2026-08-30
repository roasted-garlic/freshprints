import { useMemo } from "react";
import { X } from "lucide-react";

import { EmptyState } from "../../../shared/components/EmptyState";
import { ErrorState } from "../../../shared/components/ErrorState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { useCustomerUserInfo } from "../hooks/useCustomerUserInfo";
import { useUserAuditTrail } from "../hooks/useUserAuditTrail";
import type { AuditTrailSubject } from "../types/auditTrail.types";
import { buildAuditTrailProfile } from "../utils/buildAuditTrailProfile";
import { CustomerAccountActivitySection } from "./CustomerAccountActivitySection";
import { CustomerPrintRequestHistorySection } from "./CustomerPrintRequestHistorySection";
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

function TeamUserRecentActivitySection({
  entries,
  error,
  isLoading,
}: {
  entries: ReturnType<typeof useUserAuditTrail>["entries"];
  error: string | null;
  isLoading: boolean;
}) {
  return (
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
  );
}

export function UserAuditTrailModal({ isOpen, onClose, subject }: UserAuditTrailModalProps) {
  const { user: caller } = useAuth();
  const isCustomer = subject?.kind === "customer";
  const customer = isCustomer ? subject.customer : null;

  const teamAuditTrail = useUserAuditTrail(isOpen && subject?.kind === "team_user" ? subject : null);
  const customerUserInfo = useCustomerUserInfo(customer, isOpen && isCustomer);

  const profile = useMemo(() => (subject ? buildAuditTrailProfile(subject) : null), [subject]);

  const customerStats = useMemo(() => {
    if (!isCustomer) {
      return null;
    }

    return customerUserInfo.stats;
  }, [customerUserInfo.stats, isCustomer]);

  const teamStats = useMemo(() => {
    if (subject?.kind !== "team_user") {
      return null;
    }

    const printRequestIds = new Set<string>();
    let designsUploaded = 0;

    for (const entry of teamAuditTrail.entries) {
      if (entry.id.startsWith("print-request:")) {
        const [, printRequestId] = entry.id.split(":");
        if (printRequestId) {
          printRequestIds.add(printRequestId);
        }
      }

      if (entry.id.startsWith("design:")) {
        designsUploaded += 1;
      }
    }

    return {
      printRequests: printRequestIds.size,
      queuedShows: 0,
      accountActivity: teamAuditTrail.entries.length,
      designsUploaded,
    };
  }, [subject?.kind, teamAuditTrail.entries]);

  const canViewPrintRequests = caller ? permissionService.canViewPrintRequests(caller) : false;
  const canViewUpcomingShows = caller ? permissionService.canViewUpcomingShows(caller) : false;

  if (!isOpen || !subject || !profile) {
    return null;
  }

  const isLoading = isCustomer ? customerUserInfo.isLoading : teamAuditTrail.isLoading;
  const error = isCustomer ? customerUserInfo.error : teamAuditTrail.error;

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

      <div className="user-audit-trail-body">
        <UserAuditTrailProfileCard
          profile={profile}
          stats={
            isCustomer && customerStats
              ? {
                  printRequests: customerStats.printRequests,
                  queuedShows: customerStats.queuedShows,
                  accountActivity: customerStats.accountActivity,
                }
              : teamStats
                ? {
                    printRequests: teamStats.printRequests,
                    queuedShows: teamStats.queuedShows,
                    accountActivity: teamStats.accountActivity,
                    designsUploaded: teamStats.designsUploaded,
                  }
                : {
                    printRequests: 0,
                    queuedShows: 0,
                    accountActivity: 0,
                  }
          }
        />

        {isLoading ? (
          <div className="user-audit-trail-loading">
            <LoadingSpinner label="Loading user info" />
          </div>
        ) : null}

        {error ? <ErrorState message={error} title="Unable to load user info" /> : null}

        {isCustomer && customer && !isLoading && !error ? (
          <>
            <CustomerPrintRequestHistorySection
              canViewPrintRequests={canViewPrintRequests}
              canViewUpcomingShows={canViewUpcomingShows}
              hasMore={customerUserInfo.hasMorePrintRequests}
              isDetailLoading={customerUserInfo.isDetailLoading}
              isLoading={customerUserInfo.isLoading}
              onCloseDetail={customerUserInfo.closePrintRequestDetail}
              onLoadMore={() => void customerUserInfo.loadMorePrintRequests()}
              onOpenDetail={(printRequestId) => void customerUserInfo.openPrintRequestDetail(printRequestId)}
              selectedDetail={customerUserInfo.selectedDetail}
              selectedPrintRequestId={customerUserInfo.selectedPrintRequestId}
              summaries={customerUserInfo.printRequestSummaries}
            />
            <CustomerAccountActivitySection
              entries={customerUserInfo.accountActivityEntries}
              hasMore={customerUserInfo.hasMoreAccountActivity}
              isLoading={customerUserInfo.isLoading}
              onLoadMore={() => void customerUserInfo.loadMoreAccountActivity()}
              totalCount={customerUserInfo.stats.accountActivity}
            />
          </>
        ) : null}

        {subject.kind === "team_user" && !isLoading && !error ? (
          <TeamUserRecentActivitySection
            entries={teamAuditTrail.entries}
            error={teamAuditTrail.error}
            isLoading={teamAuditTrail.isLoading}
          />
        ) : null}
      </div>
    </UserManagementModal>
  );
}
