import { useNavigate } from "react-router-dom";

import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { EmptyState } from "../../../shared/components/EmptyState";
import type {
  PrintRequestHistoryCardSummary,
  PrintRequestHistoryDetail,
} from "../types/customerPrintRequestHistory.types";
import {
  formatPrintRequestCardCreatedLabel,
  formatPrintRequestCardDesignCountLabel,
  formatPrintRequestCardLastUpdatedLabel,
} from "../utils/buildPrintRequestHistoryCard";
import { CustomerPrintRequestHistoryDetailModal } from "./CustomerPrintRequestHistoryDetailModal";

interface CustomerPrintRequestHistorySectionProps {
  summaries: PrintRequestHistoryCardSummary[];
  selectedDetail: PrintRequestHistoryDetail | null;
  selectedPrintRequestId: string | null;
  isDetailLoading: boolean;
  hasMore: boolean;
  isLoading: boolean;
  canViewPrintRequests: boolean;
  canViewUpcomingShows: boolean;
  onOpenDetail: (printRequestId: string) => void;
  onCloseDetail: () => void;
  onLoadMore: () => void;
}

function getStatusBadgeVariant(status: PrintRequestHistoryCardSummary["status"]) {
  switch (status) {
    case "active":
      return "success";
    case "completed":
      return "info";
    case "editing":
    case "archived":
      return "warning";
    case "draft":
    default:
      return "default";
  }
}

function CustomerPrintRequestHistoryCard({
  summary,
  canViewUpcomingShows,
  onOpenDetail,
}: {
  summary: PrintRequestHistoryCardSummary;
  canViewUpcomingShows: boolean;
  onOpenDetail: (printRequestId: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <article className="customer-print-request-card">
      <button
        className="customer-print-request-card-body"
        onClick={() => onOpenDetail(summary.printRequestId)}
        type="button"
      >
        <div className="customer-print-request-card-title-row">
          <strong>{summary.name}</strong>
          <div className="customer-print-request-card-badges">
            <Badge variant={getStatusBadgeVariant(summary.status)}>{summary.lifecycleLabel}</Badge>
            <Badge variant="default">{summary.originLabel}</Badge>
          </div>
        </div>

        {summary.showContext ? (
          <div className="customer-print-request-card-show">
            {summary.missedShowContext ? (
              <span className="customer-print-request-card-show-eyebrow">Current show</span>
            ) : null}
            <strong>{summary.showContext.showTitle}</strong>
            <span className="customer-print-request-card-show-schedule">
              Scheduled {summary.showContext.scheduledLabel}
            </span>
          </div>
        ) : null}

        {summary.missedShowContext ? (
          <div className="customer-print-request-card-show customer-print-request-card-show-missed">
            <span className="customer-print-request-card-show-eyebrow">Previously · Did not print</span>
            <strong>{summary.missedShowContext.showTitle}</strong>
            <span className="customer-print-request-card-show-schedule">
              Scheduled {summary.missedShowContext.scheduledLabel}
            </span>
          </div>
        ) : null}

        <div className="customer-print-request-card-meta">
          <span>{formatPrintRequestCardCreatedLabel(summary.createdAtMillis)}</span>
          <span>{formatPrintRequestCardDesignCountLabel(summary.itemCount)}</span>
          <span>{formatPrintRequestCardLastUpdatedLabel(summary.updatedAtMillis)}</span>
        </div>

        {summary.conversion ? (
          <p className="customer-print-request-card-conversion">
            Converted →{" "}
            {summary.conversion.internalRequestName ?? summary.conversion.internalRequestId}
          </p>
        ) : null}
      </button>

      <div className="customer-print-request-card-actions">
        <Button onClick={() => onOpenDetail(summary.printRequestId)} size="sm" variant="secondary">
          Details
        </Button>
        <Button onClick={() => navigate(summary.deepLinkPath)} size="sm" variant="secondary">
          Open Print Request
        </Button>
        {canViewUpcomingShows && summary.showContext?.showDeepLinkPath ? (
          <Button
            onClick={() => navigate(summary.showContext!.showDeepLinkPath)}
            size="sm"
            variant="secondary"
          >
            Open Show Queue
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function CustomerPrintRequestHistorySection({
  summaries,
  selectedDetail,
  selectedPrintRequestId,
  isDetailLoading,
  hasMore,
  isLoading,
  canViewPrintRequests,
  canViewUpcomingShows,
  onOpenDetail,
  onCloseDetail,
  onLoadMore,
}: CustomerPrintRequestHistorySectionProps) {
  if (!canViewPrintRequests) {
    return (
      <section aria-labelledby="customer-print-request-history-title" className="customer-print-request-history">
        <div className="customer-print-request-history-header">
          <h3 id="customer-print-request-history-title">Print request history</h3>
          <p>You do not have permission to view print requests for this customer.</p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="customer-print-request-history-title" className="customer-print-request-history">
      <div className="customer-print-request-history-header">
        <h3 id="customer-print-request-history-title">Print request history</h3>
        <p>Compact cards grouped by print request, including show schedule and conversion lineage.</p>
      </div>

      {!isLoading && summaries.length === 0 ? (
        <EmptyState
          message="No print requests are associated with this customer yet."
          title="No print requests"
        />
      ) : null}

      <div className="customer-print-request-history-list">
        {summaries.map((summary) => (
          <CustomerPrintRequestHistoryCard
            canViewUpcomingShows={canViewUpcomingShows}
            key={summary.printRequestId}
            onOpenDetail={onOpenDetail}
            summary={summary}
          />
        ))}
      </div>

      {!isLoading && hasMore ? (
        <Button className="customer-print-request-history-load-more" onClick={onLoadMore} size="sm" variant="secondary">
          Load more requests
        </Button>
      ) : null}

      <CustomerPrintRequestHistoryDetailModal
        canViewUpcomingShows={canViewUpcomingShows}
        detail={selectedDetail}
        isLoading={isDetailLoading}
        isOpen={Boolean(selectedPrintRequestId) || isDetailLoading || selectedDetail !== null}
        onClose={onCloseDetail}
        previewSummary={
          selectedPrintRequestId
            ? summaries.find((summary) => summary.printRequestId === selectedPrintRequestId)
            : undefined
        }
      />
    </section>
  );
}
