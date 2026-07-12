import { useNavigate } from "react-router-dom";

import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { getPrintRequestsPath } from "../../print-requests/constants/printRequestRoutes";
import { useCustomerUploadIntake } from "../hooks/useCustomerUploadIntake";
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
}: {
  row: CustomerUploadIntakeRow;
  intake: IntakeApi;
}) {
  const navigate = useNavigate();
  const pendingAction = intake.pendingByUploadId[row.id] ?? null;
  const busy = Boolean(pendingAction);

  return (
    <div className="customer-upload-intake-detail">
      <div className="customer-upload-intake-detail-header">
        {row.previewUrl ? (
          <img
            alt=""
            className="customer-upload-intake-preview"
            src={row.previewUrl}
          />
        ) : (
          <div className="customer-upload-intake-preview customer-upload-intake-preview--empty">
            No preview
          </div>
        )}
        <div>
          <h3>{row.originalFilename}</h3>
          <p className="customer-upload-intake-meta">
            {row.customerDisplayName} · {row.catalogReviewStatus.replace(/_/g, " ")}
          </p>
        </div>
      </div>

      <dl className="customer-upload-intake-fields">
        <DetailField label="Customer" value={row.customerDisplayName} />
        <DetailField
          label="Linked request"
          value={row.printRequestName ?? row.printRequestId ?? "—"}
        />
        <DetailField label="Request status" value={row.printRequestStatus ?? "—"} />
        <DetailField label="Show assignment" value={row.showAssignmentLabel ?? "See print request"} />
        <DetailField label="Uploaded" value={formatDate(row.createdAtMs)} />
        <DetailField label="Format" value={row.sourceFormat ?? "—"} />
        <DetailField
          label="Source dimensions"
          value={formatPx(row.sourceWidthPx, row.sourceHeightPx)}
        />
        <DetailField label="Production dimensions" value={formatPx(row.widthPx, row.heightPx)} />
        <DetailField
          label="Print size"
          value={formatInches(row.printWidthInches, row.printHeightInches)}
        />
        <DetailField
          label="Effective DPI"
          value={row.effectiveDpi != null ? String(Math.round(row.effectiveDpi)) : "—"}
        />
        <DetailField
          label="Transparency"
          value={
            row.transparencyPassed == null ? "—" : row.transparencyPassed ? "Passed" : "Failed"
          }
        />
        <DetailField label="Technical status" value={row.technicalStatus} />
        <DetailField label="Catalog review" value={row.catalogReviewStatus.replace(/_/g, " ")} />
        <DetailField
          label="Ownership confirmed"
          value={row.ownershipConfirmed ? "Yes" : "No"}
        />
        <DetailField
          label="Design Library permission"
          value={
            row.catalogUseAcknowledged
              ? "Allowed"
              : "Declined — customer asked not to use in Design Library"
          }
        />
        {!row.catalogUseAcknowledged ? (
          <p className="customer-upload-intake-library-decline" role="status">
            Customer declined Design Library use. Staff may still send to AI Review if appropriate.
          </p>
        ) : null}
        {row.technicalFailureMessage ? (
          <DetailField label="Failure details" value={row.technicalFailureMessage} />
        ) : null}
        {row.promotedDesignId ? (
          <DetailField label="Promoted design" value={row.promotedDesignId} />
        ) : null}
      </dl>

      <div className="customer-upload-intake-actions">
        {row.printRequestId ? (
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
            {pendingAction === "retry" ? "Retrying…" : "Retry technical"}
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
            {pendingAction === "promote" ? "Sending to AI Review…" : "Send to AI Review"}
          </Button>
        ) : null}

        {intake.canExclude && row.catalogReviewStatus === "pending_staff_review" ? (
          <Button
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  "Exclude this upload from the catalog? Artwork stays on the print request and production files are kept.",
                )
              ) {
                void intake.exclude(row.id);
              }
            }}
            size="sm"
            variant="danger"
          >
            {pendingAction === "exclude" ? "Excluding from catalog…" : "Do not add to catalog"}
          </Button>
        ) : null}

        {intake.canExclude && row.catalogReviewStatus === "excluded_from_catalog" ? (
          <Button
            disabled={busy}
            onClick={() => {
              void intake.restore(row.id);
            }}
            size="sm"
            variant="secondary"
          >
            {pendingAction === "restore" ? "Restoring…" : "Reverse exclusion"}
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
    </div>
  );
}

export function CustomerUploadIntakeSection() {
  const intake = useCustomerUploadIntake();

  if (!intake.canView) {
    return null;
  }

  return (
    <Card className="customer-upload-intake-section">
      <div className="customer-upload-intake-header">
        <div>
          <h2>Intake for catalog review</h2>
          <p>Review Portal artwork before sending it to AI Processing or excluding it from the catalog.</p>
        </div>
        <Button
          onClick={() => {
            void intake.refresh();
          }}
          variant="secondary"
        >
          Refresh
        </Button>
      </div>

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
            <p>Loading customer uploads…</p>
          ) : intake.rows.length === 0 ? (
            <p className="customer-upload-intake-empty">
              {intake.filter === "pending_staff_review"
                ? "No uploads pending staff review."
                : "No excluded uploads."}
            </p>
          ) : (
            <div className="customer-upload-intake-layout">
              <ul className="customer-upload-intake-list">
                {intake.rows.map((row) => (
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
                      <span className="customer-upload-intake-list-title">{row.originalFilename}</span>
                      <span className="customer-upload-intake-list-sub">
                        {row.customerDisplayName} · {row.technicalStatus}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {intake.selected ? <IntakeDetail intake={intake} row={intake.selected} /> : null}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

