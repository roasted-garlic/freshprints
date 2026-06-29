import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { FormEvent } from "react";

import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { AutoResizeTextarea } from "../../../shared/components/AutoResizeTextarea";
import { Select } from "../../../shared/components/Select";
import { TextInput } from "../../../shared/components/TextInput";
import { DesignThumbnailPanel } from "../../designs/components/DesignThumbnailPanel";
import type { Design } from "../../designs/types/design.types";
import type { PrintRequestItem } from "../../../../../../shared/types/printRequest/printRequest.types";
import type { PrintRequestItemStatus } from "../../../../../../shared/types/printRequest/printRequest.enums";

interface PrintRequestItemCardProps {
  design?: Design;
  item: PrintRequestItem;
  isExpanded: boolean;
  onRemove: (item: PrintRequestItem) => void;
  onToggleExpanded: (itemId: string) => void;
  onUpdate: (event: FormEvent<HTMLFormElement>, item: PrintRequestItem) => void;
  statusBadgeVariant: "success" | "warning" | "danger" | "info" | "default";
  statusOptions: Array<{ label: string; value: PrintRequestItemStatus }>;
}

function getItemStatusLabel(status: PrintRequestItemStatus): string {
  switch (status) {
    case "canceled":
      return "Canceled";
    case "done":
      return "Done";
    case "in_progress":
      return "In progress";
    case "pending":
      return "Pending";
    case "printed":
      return "Printed";
    case "queued":
      return "Queued";
    default:
      return status;
  }
}

export function PrintRequestItemCard({
  design,
  item,
  isExpanded,
  onRemove,
  onToggleExpanded,
  onUpdate,
  statusBadgeVariant,
  statusOptions,
}: PrintRequestItemCardProps) {
  const title = design?.title ?? item.designId;
  const thumbPath = design?.thumbnailPath;

  return (
    <Card className={`print-requests-item-card${isExpanded ? " is-expanded" : " is-collapsed"}`}>
      <div className="print-requests-item-card-summary">
        <div className="print-requests-item-card-summary-main">
          <DesignThumbnailPanel
            alt={`${title} thumbnail`}
            catalogPath={thumbPath}
            className="print-requests-item-card-thumbnail"
            fallbackLabel="Thumbnail unavailable"
            imageFit="cover"
            loadingLabel="Loading thumbnail"
          />

          <div className="print-requests-item-card-summary-copy">
            <strong className="print-requests-item-card-title">{title}</strong>
            <Badge variant={statusBadgeVariant}>{getItemStatusLabel(item.status)}</Badge>
            <span className="print-requests-item-card-qty">Qty {item.quantity}</span>
          </div>
        </div>

        <div className="print-requests-item-card-summary-actions">
          <Button
            aria-label={isExpanded ? `Collapse ${title}` : `Expand ${title}`}
            onClick={() => onToggleExpanded(item.id)}
            size="sm"
            variant="ghost"
          >
            {isExpanded ? (
              <ChevronUp aria-hidden="true" size={16} strokeWidth={2} />
            ) : (
              <ChevronDown aria-hidden="true" size={16} strokeWidth={2} />
            )}
          </Button>
          <Button
            aria-label={`Remove ${title}`}
            onClick={() => onRemove(item)}
            size="sm"
            variant="danger"
            type="button"
          >
            <Trash2 aria-hidden="true" size={16} strokeWidth={2} />
          </Button>
        </div>
      </div>

      {isExpanded ? (
        <form className="print-requests-item-card-form" onSubmit={(event) => onUpdate(event, item)}>
          <div className="print-requests-item-grid">
            <TextInput
              defaultValue={String(item.quantity)}
              label="Quantity"
              name={`quantity-${item.id}`}
              inputMode="numeric"
              type="number"
              min={1}
            />

            <Select
              label="Production status"
              name={`status-${item.id}`}
              options={statusOptions}
              value={item.status}
            />
          </div>

          <AutoResizeTextarea
            defaultValue={item.notes ?? ""}
            label="Item notes"
            name={`notes-${item.id}`}
            placeholder="Optional item notes"
          />

          <div className="print-requests-item-actions">
            <Button size="sm" type="submit">
              Save item
            </Button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}
