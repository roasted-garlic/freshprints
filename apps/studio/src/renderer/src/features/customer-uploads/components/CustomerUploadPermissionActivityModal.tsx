import { useEffect } from "react";

import type { CustomerUploadPermissionActivityEntry } from "@fresh-prints/shared/types/customerUpload/customerUploadCatalogPermission.types";
import { describeCustomerUploadPermissionActivity } from "@fresh-prints/shared/utils/customerUploadPermissionFollowUp";

import { Button } from "../../../shared/components/Button";

function formatActivityWhen(value: unknown): string {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    try {
      return (value as { toDate: () => Date }).toDate().toLocaleString();
    } catch {
      return "";
    }
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toLocaleString();
  }
  return "";
}

interface CustomerUploadPermissionActivityModalProps {
  entries: CustomerUploadPermissionActivityEntry[];
  fallbackOriginalDeniedAtMs: number | null;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export function CustomerUploadPermissionActivityModal({
  entries,
  fallbackOriginalDeniedAtMs,
  isOpen,
  onClose,
  title,
}: CustomerUploadPermissionActivityModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const rows =
    entries.length > 0
      ? entries
      : fallbackOriginalDeniedAtMs
        ? [
            {
              id: "initial_denial",
              kind: "initial_denial" as const,
              at: fallbackOriginalDeniedAtMs,
              byUid: null,
            },
          ]
        : [];

  return (
    <div
      aria-labelledby="customer-upload-permission-activity-title"
      aria-modal="true"
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="modal-panel customer-upload-permission-activity-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="customer-upload-permission-activity-title">Permission activity</h2>
          <p className="customer-upload-intake-meta">{title}</p>
        </header>
        <div className="modal-body">
          {rows.length === 0 ? (
            <p className="customer-upload-intake-meta">No permission activity recorded yet.</p>
          ) : (
            <ol className="customer-upload-permission-activity-list">
              {rows.map((entry) => (
                <li key={entry.id}>
                  <strong>{describeCustomerUploadPermissionActivity(entry)}</strong>
                  <span>{formatActivityWhen(entry.at) || "—"}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <footer className="modal-footer">
          <Button onClick={onClose} size="md" type="button" variant="secondary">
            Close
          </Button>
        </footer>
      </div>
    </div>
  );
}
