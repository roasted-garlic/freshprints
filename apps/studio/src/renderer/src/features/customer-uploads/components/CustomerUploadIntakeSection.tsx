import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { resolveIntakeHalftoneStaffToggle } from "@fresh-prints/shared/utils/halftoneReviewState";

import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { Toggle } from "../../../shared/components/Toggle";
import { DesignPreviewLightbox } from "../../designs/components/DesignPreviewLightbox";
import { getPrintRequestsPath } from "../../print-requests/constants/printRequestRoutes";
import type { useCustomerUploadIntake } from "../hooks/useCustomerUploadIntake";
import type { CustomerUploadIntakeRow } from "../services/customerUploadIntakeService";

type IntakeApi = ReturnType<typeof useCustomerUploadIntake>;

function formatDate(ms: number | null): string {
  if (!ms) {
    return "—";
  }
  return new Date(ms).toLocaleString();
}

function formatInches(width: number | null, height: number | null): string {
  if (width == null || height == null) {
    return "—";
  }
  return `${width}" × ${height}"`;
}

function formatPx(width: number | null, height: number | null): string {
  if (width == null || height == null) {
    return "—";
  }
  return `${width} × ${height} px`;
}

function formatCustomerResponse(row: CustomerUploadIntakeRow): string {
  const value = row.halftoneSubmitterResponse?.value;
  if (!value || value === "unanswered") {
    return "Unanswered";
  }
  if (value === "yes") {
    return "Yes";
  }
  if (value === "no") {
    return "No";
  }
  return "Not sure";
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="customer-upload-intake-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function IntakeDetail({
  row,
  intake,
  isDonation = false,
}: {
  row: CustomerUploadIntakeRow;
  intake: IntakeApi;
  isDonation?: boolean;
}) {
  const navigate = useNavigate();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const pendingAction = intake.pendingByUploadId[row.id] ?? null;
  const busy = Boolean(pendingAction);
  const halftoneOn = resolveIntakeHalftoneStaffToggle({
    staffDecision: row.halftoneStaffDecision,
    submitterResponse: row.halftoneSubmitterResponse,
  });

  return (
    <div className="customer-upload-intake-detail">
      <div className="customer-upload-intake-detail-header">
        {row.previewUrl ? (
          <button
            aria-label={`Enlarge preview of ${row.originalFilename}`}
            className="customer-upload-intake-preview-button"
            onClick={() => setIsLightboxOpen(true)}
            type="button"
          >
            <img
              alt=""
              className="customer-upload-intake-preview"
              src={row.previewUrl}
            />
          </button>
        ) : (
          <div className="customer-upload-intake-preview customer-upload-intake-preview--empty">
            No preview
          </div>
        )}
        <div className="customer-upload-intake-detail-summary">
          <h3>{row.originalFilename}</h3>
          <p className="customer-upload-intake-meta">
            {row.customerDisplayName}
            {isDonation ? " · donation" : ""} · {row.catalogReviewStatus.replace(/_/g, " ")}
          </p>
          <p className="customer-upload-intake-meta">
            Approved max {formatInches(row.approvedMaxPrintWidthInches, row.approvedMaxPrintHeightInches)}
          </p>
        </div>
        <div className="customer-upload-intake-detail-header-actions">
          <Button onClick={() => setDetailsOpen(true)} size="sm" variant="secondary">
            Technical details
          </Button>
        </div>
      </div>

      <div className="customer-upload-intake-primary-meta">
        <div>
          <span className="customer-upload-intake-kicker">Customer selection</span>
          <strong>{formatCustomerResponse(row)}</strong>
        </div>
        <div>
          <span className="customer-upload-intake-kicker">Staff decision</span>
          <strong>{halftoneOn ? "Halftone" : "Not halftone"}</strong>
        </div>
      </div>

      <div className="customer-upload-intake-halftone-row">
        <Toggle
          checked={halftoneOn}
          disabled={busy || !intake.canPromote}
          label="Halftone"
          name={`halftone-${row.id}`}
          onChange={(checked) => {
            void intake.setHalftoneDecision(row.id, checked);
          }}
          tone="success"
        />
        <p className="customer-upload-intake-halftone-help">
          Staff override. Tag is applied only on AI Review approve.
        </p>
      </div>

      <div className="customer-upload-intake-actions">
        {!isDonation && row.printRequestId ? (
          <Button
            onClick={() => {
              navigate(
                getPrintRequestsPath({
                  requestId: row.printRequestId ?? undefined,
                  tab: "working",
                }),
              );
            }}
            size="sm"
            variant="secondary"
          >
            Open linked request
          </Button>
        ) : null}

        {intake.canRetry && row.technicalStatus === "failed" ? (
          <Button
            disabled={busy}
            onClick={() => {
              void intake.retry(row.id);
            }}
            size="sm"
            variant="secondary"
          >
            {pendingAction === "retry" ? "Retrying…" : "Retry"}
          </Button>
        ) : null}

        {intake.canPromote &&
        row.catalogReviewStatus === "pending_staff_review" &&
        row.technicalStatus === "ready" ? (
          <Button
            disabled={busy}
            onClick={() => {
              void intake.promote(row.id);
            }}
            size="sm"
            variant="primary"
          >
            {pendingAction === "promote" ? "Sending…" : "Send to AI Review"}
          </Button>
        ) : null}

        {intake.canExclude && row.catalogReviewStatus === "pending_staff_review" ? (
          <Button
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  isDonation
                    ? "Exclude this donation from the catalog? Full-size files will be deleted now. A thumbnail is kept for staff history; it will not be listed or reusable."
                    : "Exclude this upload from the catalog? Artwork stays on the print request and production files are kept.",
                )
              ) {
                void intake.exclude(row.id);
              }
            }}
            size="sm"
            variant="danger"
          >
            {pendingAction === "exclude" ? "Excluding…" : "Do not add to catalog"}
          </Button>
        ) : null}

        {intake.canExclude &&
        row.catalogReviewStatus === "excluded_from_catalog" &&
        !row.fullSizePurgedAtMs ? (
          <Button
            disabled={busy}
            onClick={() => {
              void intake.restore(row.id);
            }}
            size="sm"
            variant="secondary"
          >
            {pendingAction === "restore" ? "Restoring…" : "Restore"}
          </Button>
        ) : null}

        {row.catalogReviewStatus === "sent_to_ai_review" ? (
          <Button
            onClick={() => {
              navigate("/ai-review");
            }}
            size="sm"
            variant="secondary"
          >
            Open AI Processing
          </Button>
        ) : null}
      </div>

      {detailsOpen ? (
        <div
          aria-modal="true"
          className="modal-overlay modal-overlay-blur"
          role="dialog"
        >
          <Modal
            aria-labelledby="intake-tech-details-title"
            className="modal-panel modal-panel-lg"
          >
            <ModalHeader>
              <h2 id="intake-tech-details-title">Technical details</h2>
            </ModalHeader>
            <ModalBody>
              <dl className="customer-upload-intake-fields customer-upload-intake-fields--modal">
                <DetailField label="Customer" value={row.customerDisplayName} />
                {!isDonation ? (
                  <>
                    <DetailField
                      label="Linked request"
                      value={row.printRequestName ?? row.printRequestId ?? "—"}
                    />
                    <DetailField label="Request status" value={row.printRequestStatus ?? "—"} />
                  </>
                ) : (
                  <DetailField label="Source" value="Catalog donation" />
                )}
                <DetailField label="Uploaded" value={formatDate(row.createdAtMs)} />
                <DetailField label="Format" value={row.sourceFormat ?? "—"} />
                <DetailField
                  label="Source dimensions"
                  value={formatPx(row.sourceWidthPx, row.sourceHeightPx)}
                />
                <DetailField
                  label="Production dimensions"
                  value={formatPx(row.widthPx, row.heightPx)}
                />
                <DetailField
                  label="Print size"
                  value={formatInches(row.printWidthInches, row.printHeightInches)}
                />
                <DetailField
                  label="Effective DPI"
                  value={row.effectiveDpi != null ? String(Math.round(row.effectiveDpi)) : "—"}
                />
                <DetailField
                  label="Approved max"
                  value={formatInches(
                    row.approvedMaxPrintWidthInches,
                    row.approvedMaxPrintHeightInches,
                  )}
                />
                <DetailField
                  label="Upscale"
                  value={
                    row.wasUpscaled
                      ? `${row.upscaleFactor != null ? `${row.upscaleFactor}×` : "yes"}${
                          row.sizingWarningCode === "EXTENDED_UPSCALE"
                            ? " (extended)"
                            : row.sizingWarningCode === "TARGET_NOT_REACHED_UPSCALE_CAPPED"
                              ? " (capped)"
                              : ""
                        }`
                      : "None"
                  }
                />
                <DetailField label="Customer halftone selection" value={formatCustomerResponse(row)} />
                <DetailField
                  label="Staff halftone decision"
                  value={
                    typeof row.halftoneStaffDecision?.value === "boolean"
                      ? row.halftoneStaffDecision.value
                        ? "Halftone"
                        : "Not halftone"
                      : "Not set"
                  }
                />
                <DetailField label="Technical status" value={row.technicalStatus} />
                <DetailField
                  label="Catalog review"
                  value={row.catalogReviewStatus.replace(/_/g, " ")}
                />
                <DetailField
                  label="Ownership confirmed"
                  value={row.ownershipConfirmed ? "Yes" : "No"}
                />
                <DetailField
                  label={isDonation ? "Donation listing consent" : "Design Library permission"}
                  value={
                    row.catalogUseAcknowledged
                      ? isDonation
                        ? "Consented to catalog listing"
                        : "Allowed"
                      : "Declined"
                  }
                />
                {row.technicalFailureMessage ? (
                  <DetailField label="Failure details" value={row.technicalFailureMessage} />
                ) : null}
              </dl>
            </ModalBody>
            <ModalFooter>
              <Button onClick={() => setDetailsOpen(false)} size="sm" variant="secondary">
                Close
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      ) : null}

      <DesignPreviewLightbox
        alt={row.originalFilename}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        previewUrl={row.previewUrl}
      />
    </div>
  );
}

export function CustomerUploadIntakeSection({
  purposeScope = "print_request",
  intake,
}: {
  purposeScope?: "print_request" | "catalog_donation";
  intake: IntakeApi;
}) {
  const isDonation = purposeScope === "catalog_donation";

  if (!intake.canView) {
    return null;
  }

  return (
    <Card
      aria-label={isDonation ? "Donated designs intake" : "Uploaded designs intake"}
      className="customer-upload-intake-section"
    >
      {intake.error ? <p className="auth-message">{intake.error}</p> : null}
      {intake.notice ? <p className="customer-upload-intake-notice">{intake.notice}</p> : null}

      <div className="customer-upload-intake-panel">
        <div
          aria-label="Intake filter"
          className="customer-upload-intake-tab-bar"
          role="tablist"
        >
          <button
            aria-selected={intake.filter === "pending_staff_review"}
            className={`customer-upload-intake-tab${
              intake.filter === "pending_staff_review" ? " is-active" : ""
            }`}
            onClick={() => {
              intake.setFilter("pending_staff_review");
            }}
            role="tab"
            type="button"
          >
            Pending
          </button>
          <button
            aria-selected={intake.filter === "excluded_from_catalog"}
            className={`customer-upload-intake-tab${
              intake.filter === "excluded_from_catalog" ? " is-active" : ""
            }`}
            onClick={() => {
              intake.setFilter("excluded_from_catalog");
            }}
            role="tab"
            type="button"
          >
            Excluded
          </button>
        </div>

        <div className="customer-upload-intake-panel-body" role="tabpanel">
          {intake.isLoading && intake.rows.length === 0 ? (
            <p>Loading {isDonation ? "donations" : "customer uploads"}…</p>
          ) : intake.rows.length === 0 ? (
            <p className="customer-upload-intake-empty">
              {intake.filter === "pending_staff_review"
                ? isDonation
                  ? "No donations pending staff review."
                  : "No uploads pending staff review."
                : isDonation
                  ? "No excluded donations."
                  : "No excluded uploads."}
            </p>
          ) : (
            <div className="customer-upload-intake-layout">
              <ul className="customer-upload-intake-list">
                {intake.rows.map((row) => {
                  const customerMarked = row.halftoneSubmitterResponse?.value === "yes";
                  return (
                    <li key={row.id}>
                      <button
                        className={`customer-upload-intake-list-item${
                          intake.selectedId === row.id ? " is-selected" : ""
                        }`}
                        onClick={() => {
                          intake.setSelectedId(row.id);
                        }}
                        type="button"
                      >
                        <span className="customer-upload-intake-list-title">
                          {row.originalFilename}
                        </span>
                        <span className="customer-upload-intake-list-sub">
                          {row.customerDisplayName} · {row.technicalStatus}
                          {customerMarked ? " · customer: halftone" : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {intake.selected ? (
                <IntakeDetail intake={intake} isDonation={isDonation} row={intake.selected} />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
