import { ExternalLink, Eye } from "lucide-react";

import { formatDesignIssueReportSubmitter } from "@fresh-prints/shared/designIssueReports/formatDesignIssueReportSubmitter";
import { getStaffInboxKindLabel } from "@fresh-prints/shared/staffInbox/staffInboxItemIds";
import type { StaffInboxCompletedItem, StaffInboxItem } from "@fresh-prints/shared/staffInbox/staffInbox.types";
import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";

interface StaffInboxItemRowProps {
  compact?: boolean;
  isCompleted?: boolean;
  isHighlighted?: boolean;
  isSelectable?: boolean;
  isSelected?: boolean;
  item: StaffInboxItem | StaffInboxCompletedItem;
  onAcknowledge?: (item: StaffInboxItem) => void;
  onDelete?: (itemId: string) => void;
  onOpen: (item: StaffInboxItem) => void;
  onRestore?: (itemId: string) => void;
  onToggleSelect?: (itemId: string) => void;
}

function formatInboxTimestamp(value: number): string {
  if (!value) {
    return "Unknown time";
  }

  return new Date(value).toLocaleString();
}

function isCompletedItem(item: StaffInboxItem | StaffInboxCompletedItem): item is StaffInboxCompletedItem {
  return "acknowledgedAtMillis" in item && typeof item.acknowledgedAtMillis === "number";
}

export function StaffInboxItemRow({
  compact = false,
  isCompleted = false,
  isHighlighted = false,
  isSelectable = false,
  isSelected = false,
  item,
  onAcknowledge,
  onDelete,
  onOpen,
  onRestore,
  onToggleSelect,
}: StaffInboxItemRowProps) {
  const acknowledgedAtMillis = isCompletedItem(item) ? item.acknowledgedAtMillis : undefined;
  const acknowledgedByDisplayName = isCompletedItem(item)
    ? item.acknowledgedByDisplayName
    : undefined;
  const isDesignReport = item.kind === "design_issue_report";
  const showCheckbox = !isCompleted && !isDesignReport && Boolean(onAcknowledge);
  const submitter = isDesignReport && item.designIssueReport
    ? formatDesignIssueReportSubmitter(item.designIssueReport)
    : null;

  return (
    <li
      className={`staff-inbox-item${compact ? " staff-inbox-item-compact" : ""}${isHighlighted ? " staff-inbox-item-new" : ""}`}
    >
      <div className="staff-inbox-item-header">
        {showCheckbox ? (
          <label className="staff-inbox-item-check">
            <input
              aria-label={isDesignReport ? `Mark ${item.title} resolved` : `Mark ${item.title} done`}
              onChange={() => onAcknowledge?.(item)}
              type="checkbox"
            />
          </label>
        ) : null}
        {isCompleted && isSelectable && onToggleSelect ? (
          <label className="staff-inbox-item-check">
            <input
              aria-label={`Select ${item.title}`}
              checked={isSelected}
              onChange={() => onToggleSelect(item.id)}
              type="checkbox"
            />
          </label>
        ) : null}

        <div className="staff-inbox-item-title-row">
          <strong className="staff-inbox-item-title">{item.title}</strong>
          <Badge
            variant={
              item.kind === "portal_queued" ? "success" : item.kind === "show_queue_full" ? "danger" : "warning"
            }
          >
            {getStaffInboxKindLabel(item.kind)}
          </Badge>
        </div>
      </div>

      <div className="staff-inbox-item-detail-row">
        <div className="staff-inbox-item-detail-copy">
          {!compact ? <span className="staff-inbox-item-subtitle">{item.subtitle}</span> : null}
          {compact ? <span className="staff-inbox-item-glance">{item.subtitle}</span> : null}
          {submitter ? <span className="staff-inbox-item-submitter">Submitted by {submitter}</span> : null}
          {!compact ? (
            <div className="staff-inbox-item-timestamps">
              <span className="staff-inbox-timestamp-pill">
                Created {formatInboxTimestamp(item.occurredAtMillis)}
              </span>
              {isCompleted && acknowledgedAtMillis ? (
                <span className="staff-inbox-timestamp-pill staff-inbox-timestamp-pill-done">
                  {isDesignReport ? "Resolved" : "Marked done"} {formatInboxTimestamp(acknowledgedAtMillis)}
                  {!isDesignReport && acknowledgedByDisplayName ? ` by ${acknowledgedByDisplayName}` : ""}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="staff-inbox-item-actions">
          <Button
            className="button-leading-icon staff-inbox-item-open"
            onClick={() => onOpen(item)}
            variant="secondary"
          >
            {isDesignReport ? (
              <Eye aria-hidden="true" size={14} strokeWidth={2} />
            ) : (
              <ExternalLink aria-hidden="true" size={14} strokeWidth={2} />
            )}
            {isDesignReport ? "View Design" : "Open"}
          </Button>
          {isCompleted && onRestore ? (
            <Button onClick={() => onRestore(item.id)} variant="secondary">
              Restore
            </Button>
          ) : null}
          {isCompleted && onDelete ? (
            <Button onClick={() => onDelete(item.id)} variant="danger">
              Delete
            </Button>
          ) : null}
          {!isCompleted && isDesignReport && onAcknowledge ? <Button onClick={() => onAcknowledge(item)} variant="primary">Mark Resolved</Button> : null}
        </div>
      </div>
    </li>
  );
}
