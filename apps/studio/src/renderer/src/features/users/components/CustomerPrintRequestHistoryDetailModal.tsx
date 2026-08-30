import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import type {
  PrintRequestHistoryCardSummary,
  PrintRequestHistoryDetail,
} from "../types/customerPrintRequestHistory.types";

interface CustomerPrintRequestHistoryDetailModalProps {
  detail: PrintRequestHistoryDetail | null;
  isLoading: boolean;
  isOpen: boolean;
  canViewUpcomingShows: boolean;
  onClose: () => void;
  previewSummary?: PrintRequestHistoryCardSummary;
}

function formatAuditTimestamp(value: number): string {
  if (!value) {
    return "Unknown time";
  }

  return new Date(value).toLocaleString();
}

function getStatusBadgeVariant(
  status: PrintRequestHistoryCardSummary["status"],
): "default" | "success" | "warning" | "danger" | "info" {
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

function CustomerPrintRequestHistoryDetailContent({
  detail,
  isLoading,
  canViewUpcomingShows,
}: {
  detail: PrintRequestHistoryDetail;
  isLoading: boolean;
  canViewUpcomingShows: boolean;
}) {
  const navigate = useNavigate();
  const { summary } = detail;

  return (
    <>
      <div className="customer-print-request-detail-badges">
        <Badge variant={getStatusBadgeVariant(summary.status)}>{summary.lifecycleLabel}</Badge>
        <Badge variant="default">{summary.originLabel}</Badge>
      </div>

      {summary.showContext ? (
        <div className="customer-print-request-detail-show">
          {summary.missedShowContext ? (
            <span className="customer-print-request-detail-show-eyebrow">Current show</span>
          ) : null}
          <strong>{summary.showContext.showTitle}</strong>
          <span>Scheduled {summary.showContext.scheduledLabel}</span>
          {summary.showContext.queuedToShowLabel ? (
            <span>Queued to show {summary.showContext.queuedToShowLabel}</span>
          ) : null}
        </div>
      ) : null}

      {summary.missedShowContext ? (
        <div className="customer-print-request-detail-show customer-print-request-detail-show-missed">
          <span className="customer-print-request-detail-show-eyebrow">Previously · Did not print</span>
          <strong>{summary.missedShowContext.showTitle}</strong>
          <span>Scheduled {summary.missedShowContext.scheduledLabel}</span>
          {summary.missedShowContext.queuedToShowLabel ? (
            <span>Originally queued {summary.missedShowContext.queuedToShowLabel}</span>
          ) : null}
        </div>
      ) : null}

      {summary.conversion ? (
        <p className="customer-print-request-detail-conversion">
          Converted to Internal Request
          {summary.conversion.internalRequestName
            ? ` · ${summary.conversion.internalRequestName}`
            : ` · ${summary.conversion.internalRequestId}`}
        </p>
      ) : null}

      {summary.convertedFrom ? (
        <p className="customer-print-request-detail-conversion">
          Converted from Customer Request
          {summary.convertedFrom.customerRequestName
            ? ` · ${summary.convertedFrom.customerRequestName}`
            : ` · ${summary.convertedFrom.customerRequestId}`}
        </p>
      ) : null}

      <div className="customer-print-request-detail-actions">
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
        {summary.internalDeepLinkPath && summary.internalDeepLinkPath !== summary.deepLinkPath ? (
          <Button
            onClick={() => navigate(summary.internalDeepLinkPath!)}
            size="sm"
            variant="secondary"
          >
            Open Internal Request
          </Button>
        ) : null}
        {summary.archivedCustomerDeepLinkPath ? (
          <Button
            onClick={() => navigate(summary.archivedCustomerDeepLinkPath!)}
            size="sm"
            variant="secondary"
          >
            View archived customer request
          </Button>
        ) : null}
        {summary.customerDeepLinkPath && !summary.archivedCustomerDeepLinkPath ? (
          <Button
            onClick={() => navigate(summary.customerDeepLinkPath!)}
            size="sm"
            variant="secondary"
          >
            Open Customer Request
          </Button>
        ) : null}
      </div>

      {isLoading ? <p className="customer-print-request-detail-loading">Refreshing history…</p> : null}

      {!isLoading && detail.events.length > 0 ? (
        <ol className="customer-print-request-detail-events">
          {detail.events.map((event) => (
            <li className="customer-print-request-detail-event" key={event.id}>
              <div className="customer-print-request-detail-event-header">
                <strong>{event.label}</strong>
                <span>{formatAuditTimestamp(event.occurredAtMillis)}</span>
              </div>
              {event.detail ? <p>{event.detail}</p> : null}
            </li>
          ))}
        </ol>
      ) : null}

      {!isLoading && detail.events.length === 0 ? (
        <p className="customer-print-request-detail-empty">
          No detailed history is available for this request.
        </p>
      ) : null}

      {detail.hasMoreEvents ? (
        <p className="customer-print-request-detail-more">
          Showing {detail.events.length} of {detail.totalEventCount} events.
        </p>
      ) : null}
    </>
  );
}

export function CustomerPrintRequestHistoryDetailModal({
  detail,
  isLoading,
  isOpen,
  canViewUpcomingShows,
  onClose,
  previewSummary,
}: CustomerPrintRequestHistoryDetailModalProps) {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const summaryTitle =
    detail?.summary.name ?? previewSummary?.name ?? "Print request details";

  return createPortal(
    <div
      className="modal-overlay modal-overlay-blur customer-print-request-detail-modal-overlay"
      onClick={onClose}
    >
      <div
        className="customer-print-request-detail-modal-shell"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <section
          aria-labelledby="customer-print-request-detail-title"
          aria-modal="true"
          className="modal-panel modal-panel-md customer-print-request-detail-modal"
          role="dialog"
        >
          <button
            aria-label="Close print request details"
            className="icon-button icon-button-md icon-button-ghost customer-print-request-detail-modal-close"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>

          <header className="customer-print-request-detail-modal-header">
            <p className="customer-print-request-detail-eyebrow">Print request details</p>
            <h4 id="customer-print-request-detail-title">{summaryTitle}</h4>
          </header>

          <div className="customer-print-request-detail-modal-body">
            {isLoading && !detail ? (
              <div className="customer-print-request-detail-modal-loading">
                <LoadingSpinner label="Loading print request details" />
              </div>
            ) : null}

            {detail ? (
              <CustomerPrintRequestHistoryDetailContent
                canViewUpcomingShows={canViewUpcomingShows}
                detail={detail}
                isLoading={isLoading}
              />
            ) : null}

            {!isLoading && !detail ? (
              <p className="customer-print-request-detail-empty">
                Unable to load print request details.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
