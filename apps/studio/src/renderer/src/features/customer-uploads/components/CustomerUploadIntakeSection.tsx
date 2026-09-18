import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

import { isCustomerUploadEligibleForCatalogIntake } from "@fresh-prints/shared/utils/customerUploadCatalogIntakeEligibility";
import { canRequestCustomerUploadPermissionFollowUp } from "@fresh-prints/shared/utils/customerUploadPermissionFollowUp";
import { resolveIntakeHalftoneStaffToggle } from "@fresh-prints/shared/utils/halftoneReviewState";
import {
  getPreviewLightboxNavigationState,
  isPreviewLightboxEditableKeyboardTarget,
} from "@fresh-prints/shared/utils/previewLightboxNavigation";

import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { DangerOverflowMenu } from "../../../shared/components/DangerOverflowMenu";
import { GlobalSearchField } from "../../../shared/components/GlobalSearchField";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import {
  applyAiReviewMultiSelectRange,
  resolveAiReviewQueueCardClick,
  toggleAiReviewMultiSelectId,
} from "../../ai-review/utils/aiReviewQueueMultiSelect";
import { DesignPreviewLightbox } from "../../designs/components/DesignPreviewLightbox";
import { buildPrintRequestDeepLinkPath } from "../../print-requests/constants/printRequestRoutes";
import type { useCustomerUploadIntake } from "../hooks/useCustomerUploadIntake";
import type { CustomerUploadIntakeRow } from "../services/customerUploadIntakeService";
import { CustomerUploadDeletionDialog } from "./CustomerUploadDeletionDialog";
import { CustomerUploadPermissionActivityModal } from "./CustomerUploadPermissionActivityModal";
import { CustomerUploadRestoreDialog } from "./CustomerUploadRestoreDialog";
import { CustomerUploadIntakePreviewControls } from "./CustomerUploadIntakePreviewControls";
import { resolveCustomerUploadPreviewBackgroundHex } from "../utils/customerUploadPreviewBackground";

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

function formatCustomerHalftone(row: CustomerUploadIntakeRow): string {
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

/** Library consent from `catalogUseAcknowledged`. Missing on older rows → Pending. */
function formatLibraryConsent(row: CustomerUploadIntakeRow): string {
  if (row.catalogUseAcknowledged === true) {
    return "Approved";
  }
  if (row.catalogUseAcknowledged === false) {
    return "Denied";
  }
  return "Pending";
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
  onOpenPreview,
  onEnterMultiSelect,
  canEnterMultiSelect = false,
}: {
  row: CustomerUploadIntakeRow;
  intake: IntakeApi;
  isDonation?: boolean;
  onOpenPreview?: () => void;
  onEnterMultiSelect?: () => void;
  canEnterMultiSelect?: boolean;
}) {
  const navigate = useNavigate();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [isPermissionActivityOpen, setIsPermissionActivityOpen] = useState(false);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const restoreTriggerRef = useRef<HTMLButtonElement | null>(null);
  const pendingAction = intake.pendingByUploadId[row.id] ?? null;
  const busy = Boolean(pendingAction);
  const metadataSavePending = pendingAction === "halftone" || pendingAction === "artwork_background";
  const metadataSaveFailed = Boolean(intake.metadataFailedByUploadId?.[row.id]);
  const metadataBlocksPromote = metadataSavePending || metadataSaveFailed;
  const fromAssisted = Boolean(row.assistedCreationRequestId);
  const catalogIntakeEligible = isCustomerUploadEligibleForCatalogIntake({
    catalogUseAcknowledged: row.catalogUseAcknowledged,
    catalogPermissionFollowUpStatus: row.catalogPermissionFollowUpStatus,
  });
  const permissionDenied = row.catalogExclusionReason === "customer_permission_denied";
  const canAskPermissionAgain =
    permissionDenied &&
    canRequestCustomerUploadPermissionFollowUp({
      catalogReviewStatus: row.catalogReviewStatus,
      catalogExclusionReason: row.catalogExclusionReason,
      catalogPermissionFollowUpStatus: row.catalogPermissionFollowUpStatus,
      catalogPermissionAskCount: row.catalogPermissionAskCount,
    });
  const showDeleteMenu = intake.canDeleteEligible && !row.promotedDesignId;
  const overflowItems = [
    ...(onEnterMultiSelect
      ? [
          {
            id: "multiple-select",
            label: "Multiple select",
            danger: false as const,
            disabled: busy || !canEnterMultiSelect,
            onSelect: onEnterMultiSelect,
          },
        ]
      : []),
    ...(showDeleteMenu
      ? [
          {
            id: "delete-upload",
            label: "Delete Upload",
            disabled: busy || pendingAction === "delete",
            onSelect: () => {
              setIsDeleteOpen(true);
            },
          },
        ]
      : []),
  ];
  const halftoneOn = resolveIntakeHalftoneStaffToggle({
    staffDecision: row.halftoneStaffDecision,
    submitterResponse: row.halftoneSubmitterResponse,
  });
  const previewBackgroundHex = resolveCustomerUploadPreviewBackgroundHex({
    artworkBackgroundHex: row.artworkBackgroundHex,
    artworkBackgroundSource: row.artworkBackgroundSource,
    halftoneOn,
    autoSuggestsDark: row.suggestDarkArtworkBackground === true,
  });
  const previewStyle = {
    ["--color-artwork-preview-bg" as string]: previewBackgroundHex,
    backgroundColor: previewBackgroundHex,
  } as CSSProperties;

  return (
    <div className="customer-upload-intake-detail">
      <section aria-label="Upload preview" className="customer-upload-intake-preview-section">
        <div className="customer-upload-intake-preview-controls-row">
          <div className="customer-upload-intake-preview-overflow-menu">
            {overflowItems.length > 0 ? (
              <DangerOverflowMenu
                align="start"
                ariaLabel={`More actions for ${row.originalFilename}`}
                disabled={busy}
                items={overflowItems}
                placement="bottom"
                triggerRef={deleteTriggerRef}
              />
            ) : null}
          </div>
          <CustomerUploadIntakePreviewControls
            artworkBackgroundHex={row.artworkBackgroundHex}
            artworkBackgroundSource={row.artworkBackgroundSource}
            autoSuggestsDark={row.suggestDarkArtworkBackground === true}
            disabled={busy || !intake.canPromote}
            halftoneOn={halftoneOn}
            onArtworkBackgroundChange={(hex, source) => {
              void intake.setArtworkBackgroundDecision?.(row.id, hex, source);
            }}
            onHalftoneChange={(value) => {
              void intake.setHalftoneDecision(row.id, value);
            }}
          />
        </div>

        <div className="customer-upload-intake-preview-frame">
          <div aria-hidden="true" className="customer-upload-intake-preview-overflow" />

          <div className="customer-upload-intake-preview-stage" style={previewStyle}>
            {row.previewUrl ? (
              <button
                aria-label={`Enlarge preview of ${row.originalFilename}`}
                className="customer-upload-intake-preview-button"
                onClick={() => onOpenPreview?.()}
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
          </div>

          <aside className="customer-upload-intake-preview-sidebar">
            <div className="customer-upload-intake-detail-utility-actions">
              {!isDonation && row.printRequestId ? (
                <Button
                  onClick={() => {
                    if (!row.printRequestId) {
                      return;
                    }
                    navigate(
                      buildPrintRequestDeepLinkPath({
                        id: row.printRequestId,
                        isInternal: row.printRequestIsInternal ?? undefined,
                        queueTab: row.printRequestQueueTab,
                        itemCount: row.printRequestItemCount ?? undefined,
                        updatedAtMillis: row.printRequestUpdatedAtMs ?? undefined,
                      }),
                    );
                  }}
                  size="sm"
                  variant="secondary"
                >
                  Open linked request
                </Button>
              ) : null}
              <Button onClick={() => setDetailsOpen(true)} size="sm" variant="secondary">
                Technical details
              </Button>
            </div>
            <div className="customer-upload-intake-primary-meta">
              <div>
                <span className="customer-upload-intake-kicker">Customer halftone</span>
                <strong>{formatCustomerHalftone(row)}</strong>
              </div>
              <div>
                <span className="customer-upload-intake-kicker">Design Library</span>
                <strong>{formatLibraryConsent(row)}</strong>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <div className="customer-upload-intake-detail-body">
        <div className="customer-upload-intake-detail-summary">
          <h3 className="customer-upload-intake-detail-title">{row.originalFilename}</h3>
          <p className="customer-upload-intake-meta">
            {row.customerDisplayName}
            {isDonation ? " · donation" : ""} · {row.catalogReviewStatus.replace(/_/g, " ")}
          </p>
          <p className="customer-upload-intake-meta">
            Approved max {formatInches(row.approvedMaxPrintWidthInches, row.approvedMaxPrintHeightInches)}
          </p>
        </div>

        <section
          aria-label="Intake actions"
          className="customer-upload-intake-actions-section"
        >
          <div className="customer-upload-intake-actions">
            <div className="customer-upload-intake-actions-primary">
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

              {metadataSaveFailed && intake.canPromote ? (
                <Button
                  disabled={busy}
                  onClick={() => {
                    void intake.retryMetadataSave?.(row.id);
                  }}
                  size="sm"
                  variant="secondary"
                >
                  {metadataSavePending ? "Retrying metadata…" : "Retry metadata save"}
                </Button>
              ) : null}

              {intake.canPromote &&
              catalogIntakeEligible &&
              row.catalogReviewStatus === "pending_staff_review" &&
              row.technicalStatus === "ready" ? (
                <Button
                  disabled={busy || metadataBlocksPromote}
                  onClick={() => {
                    void intake.promote(row.id);
                  }}
                  size="sm"
                  variant="primary"
                  title={
                    metadataSaveFailed
                      ? "Metadata save failed — retry before sending to AI Review"
                      : metadataSavePending
                        ? "Saving Halftone or Artwork Background decision..."
                        : undefined
                  }
                >
                  {pendingAction === "promote"
                    ? "Sending…"
                    : metadataSavePending
                      ? "Saving..."
                      : metadataSaveFailed
                        ? "Fix metadata to send"
                        : "Send to AI Review"}
                </Button>
              ) : null}

              {intake.canExclude &&
              catalogIntakeEligible &&
              row.catalogReviewStatus === "pending_staff_review" ? (
                <Button
                  disabled={busy}
                  onClick={() => {
                    void intake.exclude(row.id);
                  }}
                  size="sm"
                  variant="danger"
                >
                  {pendingAction === "exclude" ? "Excluding…" : "Do not add to catalog"}
                </Button>
              ) : null}

              {intake.canExclude &&
              row.catalogReviewStatus === "excluded_from_catalog" &&
              permissionDenied ? (
                <div className="customer-upload-intake-permission-follow-up">
                  <div className="customer-upload-intake-permission-pill-row">
                    <span className="customer-upload-intake-status-badge">
                      Customer declined Design Library permission
                    </span>
                  </div>
                  <div className="customer-upload-intake-permission-actions">
                    <Button
                      disabled={busy}
                      onClick={() => setIsPermissionActivityOpen(true)}
                      size="sm"
                      variant="secondary"
                    >
                      Activity
                    </Button>
                    {canAskPermissionAgain ? (
                      <Button
                        disabled={busy}
                        onClick={() => {
                          void intake.requestPermissionFollowUp(row.id);
                        }}
                        size="sm"
                        variant="secondary"
                      >
                        {pendingAction === "request_permission"
                          ? "Sending…"
                          : row.catalogPermissionAskCount >= 1
                            ? "Ask again (2 of 2)"
                            : "Ask for permission again"}
                      </Button>
                    ) : row.catalogPermissionFollowUpStatus === "requested" ? (
                      <p className="customer-upload-intake-meta" role="status">
                        Waiting for the customer (ask {row.catalogPermissionAskCount || 1} of 2).
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {intake.canExclude &&
              row.catalogReviewStatus === "excluded_from_catalog" &&
              !permissionDenied ? (
                <div>
                  <button
                    className="button button-secondary button-sm"
                    disabled={busy || Boolean(row.fullSizePurgedAtMs)}
                    onClick={() => setIsRestoreOpen(true)}
                    ref={restoreTriggerRef}
                    type="button"
                  >
                    Restore to Pending
                  </button>
                  {row.fullSizePurgedAtMs ? (
                    <p className="customer-upload-intake-meta" role="status">
                      This historical upload cannot be restored because its full-size artwork was
                      previously removed.
                    </p>
                  ) : null}
                </div>
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

          {row.catalogReviewStatus === "pending_staff_review" ? (
            <div className="customer-upload-intake-shortcuts-row">
              <p className="customer-upload-intake-shortcuts-hint">
                Shortcuts: A send to AI Review, R exclude
              </p>
              <p className="customer-upload-intake-shortcuts-hint customer-upload-intake-shortcuts-hint--end">
                Shortcuts: ↑ previous, ↓ next
              </p>
            </div>
          ) : (
            <div className="customer-upload-intake-shortcuts-row">
              <span aria-hidden="true" className="customer-upload-intake-shortcuts-row-spacer" />
              <p className="customer-upload-intake-shortcuts-hint customer-upload-intake-shortcuts-hint--end">
                Shortcuts: ↑ previous, ↓ next
              </p>
            </div>
          )}
        </section>
      </div>

      <CustomerUploadDeletionDialog
        isOpen={isDeleteOpen}
        onCancel={() => {
          setIsDeleteOpen(false);
          deleteTriggerRef.current?.focus();
        }}
        onCompleted={(message) => {
          setIsDeleteOpen(false);
          intake.deleteCompleted(row.id, message);
        }}
        title={row.originalFilename}
        uploadId={row.id}
      />

      <CustomerUploadRestoreDialog
        isOpen={isRestoreOpen}
        isSubmitting={pendingAction === "restore"}
        onCancel={() => {
          setIsRestoreOpen(false);
          restoreTriggerRef.current?.focus();
        }}
        onConfirm={async () => {
          const succeeded = await intake.restore(row.id);
          if (succeeded) {
            setIsRestoreOpen(false);
          }
          return succeeded;
        }}
        title={row.originalFilename}
      />

      <CustomerUploadPermissionActivityModal
        entries={row.catalogPermissionActivity}
        fallbackOriginalDeniedAtMs={row.catalogPermissionOriginalDeniedAtMs}
        isOpen={isPermissionActivityOpen}
        onClose={() => setIsPermissionActivityOpen(false)}
        title={row.originalFilename}
      />

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
                ) : null}
                <DetailField
                  label="Source"
                  value={
                    fromAssisted
                      ? "Custom design (Assisted)"
                      : isDonation
                        ? "Catalog donation"
                        : "Customer upload"
                  }
                />
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
                <DetailField label="Customer halftone" value={formatCustomerHalftone(row)} />
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
                <DetailField label="Design Library" value={formatLibraryConsent(row)} />
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
    </div>
  );
}

function IntakeMultiSelectPanel({
  selectedCount,
  canPromote,
  canExclude,
  isBulkActionRunning,
  onPromote,
  onExclude,
  onExit,
}: {
  selectedCount: number;
  canPromote: boolean;
  canExclude: boolean;
  isBulkActionRunning: boolean;
  onPromote: () => void;
  onExclude: () => void;
  onExit: () => void;
}) {
  return (
    <div className="customer-upload-intake-detail">
      <section aria-label="Multiple select" className="customer-upload-intake-preview-section">
        <div className="customer-upload-intake-preview-controls-row">
          <div className="customer-upload-intake-preview-overflow-menu">
            <Button disabled={isBulkActionRunning} onClick={onExit} size="sm" variant="secondary">
              Exit
            </Button>
          </div>
        </div>
        <div className="customer-upload-intake-preview-frame">
          <div aria-hidden="true" className="customer-upload-intake-preview-overflow" />
          <div className="customer-upload-intake-preview-stage customer-upload-intake-preview-stage--multi">
            <div className="customer-upload-intake-preview customer-upload-intake-preview--empty">
              Select uploads in the list
            </div>
          </div>
          <aside className="customer-upload-intake-preview-sidebar" aria-hidden="true" />
        </div>
      </section>

      <div className="customer-upload-intake-detail-body">
        <div className="customer-upload-intake-detail-summary">
          <h3 className="customer-upload-intake-detail-title">
            {selectedCount} selected
          </h3>
          <p className="customer-upload-intake-meta">
            Choose uploads in the list, then send them to AI Review or exclude them.
          </p>
        </div>

        <section aria-label="Intake actions" className="customer-upload-intake-actions-section">
          <div className="customer-upload-intake-actions">
            <div className="customer-upload-intake-actions-primary">
              {canPromote ? (
                <Button
                  disabled={isBulkActionRunning || selectedCount === 0}
                  onClick={onPromote}
                  size="sm"
                  variant="primary"
                >
                  {isBulkActionRunning ? "Working…" : "Send Selected to AI Review"}
                </Button>
              ) : null}
              {canExclude ? (
                <Button
                  disabled={isBulkActionRunning || selectedCount === 0}
                  onClick={onExclude}
                  size="sm"
                  variant="danger"
                >
                  {isBulkActionRunning ? "Working…" : "Exclude Selected"}
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      </div>
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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  const [multiSelectAnchorId, setMultiSelectAnchorId] = useState<string | null>(null);
  const [isBulkActionRunning, setIsBulkActionRunning] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const previewNavigationItems = intake.rows
    .filter((row): row is CustomerUploadIntakeRow & { previewUrl: string } =>
      Boolean(row.previewUrl?.trim()),
    )
    .map((row) => {
      const halftoneOn = resolveIntakeHalftoneStaffToggle({
        staffDecision: row.halftoneStaffDecision,
        submitterResponse: row.halftoneSubmitterResponse,
      });
      return {
        id: row.id,
        alt: row.originalFilename,
        previewUrl: row.previewUrl,
        artworkBackgroundHex: resolveCustomerUploadPreviewBackgroundHex({
          artworkBackgroundHex: row.artworkBackgroundHex,
          artworkBackgroundSource: row.artworkBackgroundSource,
          halftoneOn,
          autoSuggestsDark: row.suggestDarkArtworkBackground === true,
        }),
      };
    });

  const selectedPreviewItem =
    previewNavigationItems.find((item) => item.id === intake.selectedId) ?? null;

  const listItemIds = intake.rows.map((row) => row.id);
  const listNavigationState = getPreviewLightboxNavigationState(listItemIds, intake.selectedId);
  const setSelectedId = intake.setSelectedId;

  useEffect(() => {
    setIsLightboxOpen(false);
    setIsMultiSelectMode(false);
    setMultiSelectedIds([]);
    setMultiSelectAnchorId(null);
    setBulkResult(null);
  }, [intake.filter, intake.searchQuery, purposeScope]);

  useEffect(() => {
    const visibleIds = new Set(intake.rows.map((row) => row.id));
    setMultiSelectedIds((current) => current.filter((id) => visibleIds.has(id)));
    setMultiSelectAnchorId((current) => (current && visibleIds.has(current) ? current : null));
  }, [intake.rows]);

  useEffect(() => {
    if (!selectedPreviewItem) {
      setIsLightboxOpen(false);
    }
  }, [selectedPreviewItem, isMultiSelectMode]);

  useEffect(() => {
    if (isMultiSelectMode) {
      setIsLightboxOpen(false);
    }
  }, [isMultiSelectMode]);

  useEffect(() => {
    const selectedRow = intake.selected;
    if (!selectedRow || isMultiSelectMode) {
      return;
    }
    const selectedRowSnapshot = selectedRow;

    function handleIntakeActionKeyDown(event: KeyboardEvent) {
      if (isPreviewLightboxEditableKeyboardTarget(event.target)) {
        return;
      }
      if (document.querySelector(".modal-overlay")) {
        return;
      }

      const key = event.key.toLowerCase();
      const metadataSavePending =
        intake.pendingByUploadId[selectedRowSnapshot.id] === "halftone" ||
        intake.pendingByUploadId[selectedRowSnapshot.id] === "artwork_background";
      const metadataSaveFailed = Boolean(
        intake.metadataFailedByUploadId?.[selectedRowSnapshot.id],
      );
      const catalogIntakeEligible = isCustomerUploadEligibleForCatalogIntake({
        catalogUseAcknowledged: selectedRowSnapshot.catalogUseAcknowledged,
        catalogPermissionFollowUpStatus: selectedRowSnapshot.catalogPermissionFollowUpStatus,
      });
      const rowBusy = Boolean(intake.pendingByUploadId[selectedRowSnapshot.id]);

      if (
        key === "a" &&
        intake.canPromote &&
        catalogIntakeEligible &&
        selectedRowSnapshot.catalogReviewStatus === "pending_staff_review" &&
        selectedRowSnapshot.technicalStatus === "ready" &&
        !rowBusy &&
        !metadataSavePending &&
        !metadataSaveFailed
      ) {
        event.preventDefault();
        void intake.promote(selectedRowSnapshot.id);
        return;
      }

      if (
        key === "r" &&
        intake.canExclude &&
        catalogIntakeEligible &&
        selectedRowSnapshot.catalogReviewStatus === "pending_staff_review" &&
        !rowBusy
      ) {
        event.preventDefault();
        void intake.exclude(selectedRowSnapshot.id);
      }
    }

    window.addEventListener("keydown", handleIntakeActionKeyDown);
    return () => window.removeEventListener("keydown", handleIntakeActionKeyDown);
  }, [intake, isMultiSelectMode]);

  async function runBulkAction(action: "promote" | "exclude") {
    if (isBulkActionRunning || multiSelectedIds.length === 0) {
      return;
    }

    setIsBulkActionRunning(true);
    setBulkResult(null);
    const selectedIdsAtStart = [...multiSelectedIds];
    let succeeded = 0;
    let failed = 0;

    for (const uploadId of selectedIdsAtStart) {
      const didSucceed =
        action === "promote" ? await intake.promote(uploadId) : await intake.exclude(uploadId);
      if (didSucceed) {
        succeeded += 1;
        setMultiSelectedIds((current) => current.filter((id) => id !== uploadId));
      } else {
        failed += 1;
      }
    }

    setBulkResult(
      action === "promote"
        ? `Sent ${succeeded} selected upload${succeeded === 1 ? "" : "s"} to AI Review${
            failed > 0 ? `; ${failed} failed or were skipped.` : "."
          }`
        : `Excluded ${succeeded} selected upload${succeeded === 1 ? "" : "s"}${
            failed > 0 ? `; ${failed} failed or were skipped.` : "."
          }`,
    );
    setIsBulkActionRunning(false);
  }

  useEffect(() => {
    if (listItemIds.length === 0) {
      return;
    }

    function handleListKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
        return;
      }

      if (isPreviewLightboxEditableKeyboardTarget(event.target)) {
        return;
      }

      // Leave arrows alone while lightbox/modals own the keyboard surface.
      if (document.querySelector(".modal-overlay")) {
        return;
      }

      const nextId =
        event.key === "ArrowUp" ? listNavigationState.previousId : listNavigationState.nextId;
      if (!nextId) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      setSelectedId(nextId);
      const target = document.querySelector<HTMLElement>(
        `[data-customer-upload-intake-id="${CSS.escape(nextId)}"]`,
      );
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "nearest" });
    }

    window.addEventListener("keydown", handleListKeyDown);
    return () => window.removeEventListener("keydown", handleListKeyDown);
  }, [
    setSelectedId,
    listItemIds.length,
    listNavigationState.nextId,
    listNavigationState.previousId,
  ]);

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
      {bulkResult ? (
        <p className="customer-upload-intake-notice" role="status">
          {bulkResult}
        </p>
      ) : null}

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
          {!isDonation ? (
            <button
              aria-selected={intake.filter === "denied"}
              className={`customer-upload-intake-tab${
                intake.filter === "denied" ? " is-active" : ""
              }`}
              onClick={() => {
                intake.setFilter("denied");
              }}
              role="tab"
              type="button"
            >
              Denied{intake.deniedCount > 0 ? ` (${intake.deniedCount})` : ""}
            </button>
          ) : null}
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
          <div className="customer-upload-intake-layout">
            <div className="customer-upload-intake-list-column">
              <div className="customer-upload-intake-list-search">
                <GlobalSearchField
                  clearable
                  onChange={intake.setSearchQuery}
                  placeholder="Search name or username…"
                  value={intake.searchQuery}
                />
              </div>
              {intake.isLoading && intake.rows.length === 0 ? (
                <p>Loading {isDonation ? "donations" : "customer uploads"}…</p>
              ) : intake.rows.length === 0 ? (
                <p className="customer-upload-intake-empty">
                  {intake.searchQuery.trim()
                    ? isDonation
                      ? "No donations match that name or username."
                      : "No uploads match that name or username."
                    : intake.filter === "pending_staff_review"
                      ? isDonation
                        ? "No donations pending staff review."
                        : "No uploads pending staff review."
                      : intake.filter === "denied"
                        ? "No customer permission denials."
                      : isDonation
                        ? "No excluded donations."
                        : "No excluded uploads."}
                </p>
              ) : (
                <ul className="customer-upload-intake-list">
                  {intake.rows.map((row) => {
                    const customerMarked = row.halftoneSubmitterResponse?.value === "yes";
                    return (
                      <li key={row.id}>
                        <button
                          className={`customer-upload-intake-list-item${
                            intake.selectedId === row.id ? " is-selected" : ""
                          }${
                            isMultiSelectMode && multiSelectedIds.includes(row.id)
                              ? " is-multi-selected"
                              : ""
                          }`}
                          aria-pressed={
                            isMultiSelectMode ? multiSelectedIds.includes(row.id) : undefined
                          }
                          data-customer-upload-intake-id={row.id}
                          onClick={(event) => {
                            if (!isMultiSelectMode) {
                              intake.setSelectedId(row.id);
                              return;
                            }

                            const clickBehavior = resolveAiReviewQueueCardClick({
                              isMultiSelectMode: true,
                              shiftKey: event.shiftKey,
                            });
                            if (clickBehavior === "range-multi") {
                              const range = applyAiReviewMultiSelectRange({
                                anchorId: multiSelectAnchorId,
                                listIds: listItemIds,
                                selectedIds: multiSelectedIds,
                                targetId: row.id,
                              });
                              setMultiSelectedIds(range.selectedIds);
                              setMultiSelectAnchorId(range.anchorId);
                            } else {
                              setMultiSelectedIds((current) =>
                                toggleAiReviewMultiSelectId(current, row.id),
                              );
                              setMultiSelectAnchorId(row.id);
                            }
                          }}
                          type="button"
                        >
                          <span className="customer-upload-intake-list-title">
                            {row.originalFilename}
                          </span>
                          <span className="customer-upload-intake-list-sub">
                            {row.customerUsername?.trim()
                              ? `${row.customerDisplayName} (@${row.customerUsername.trim()}) · ${row.technicalStatus}`
                              : `${row.customerDisplayName} · ${row.technicalStatus}`}
                            {customerMarked ? " · customer: halftone" : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {intake.hasMore ? (
                    <li className="customer-upload-intake-load-more-item">
                      <Button
                        className="customer-upload-intake-load-more"
                        disabled={intake.isLoadingMore}
                        onClick={() => intake.loadMore()}
                        size="sm"
                        type="button"
                        variant="secondary"
                      >
                        {intake.isLoadingMore ? "Loading…" : "Load more"}
                      </Button>
                    </li>
                  ) : null}
                </ul>
              )}
            </div>
            {isMultiSelectMode ? (
              <IntakeMultiSelectPanel
                canExclude={intake.canExclude}
                canPromote={intake.canPromote}
                isBulkActionRunning={isBulkActionRunning}
                onExclude={() => void runBulkAction("exclude")}
                onExit={() => {
                  setIsMultiSelectMode(false);
                  const nextSelectedId = multiSelectedIds[0] ?? null;
                  setMultiSelectedIds([]);
                  setMultiSelectAnchorId(null);
                  intake.setSelectedId(nextSelectedId);
                }}
                onPromote={() => void runBulkAction("promote")}
                selectedCount={multiSelectedIds.length}
              />
            ) : intake.selected ? (
              <IntakeDetail
                canEnterMultiSelect={intake.rows.length > 0}
                intake={intake}
                isDonation={isDonation}
                key={`${intake.filter}:${intake.selected.id}`}
                onEnterMultiSelect={() => {
                  const currentId = intake.selected?.id ?? null;
                  setIsMultiSelectMode(true);
                  setMultiSelectedIds(currentId ? [currentId] : []);
                  setMultiSelectAnchorId(currentId);
                  intake.setSelectedId(null);
                }}
                onOpenPreview={
                  intake.selected.previewUrl?.trim()
                    ? () => setIsLightboxOpen(true)
                    : undefined
                }
                row={intake.selected}
              />
            ) : null}
          </div>
        </div>
      </div>

      <DesignPreviewLightbox
        activeItemId={selectedPreviewItem?.id ?? null}
        alt={selectedPreviewItem?.alt ?? "Upload preview"}
        artworkBackgroundHex={selectedPreviewItem?.artworkBackgroundHex}
        isOpen={isLightboxOpen && Boolean(selectedPreviewItem)}
        navigationItems={
          previewNavigationItems.length > 1 ? previewNavigationItems : undefined
        }
        onActiveItemChange={intake.setSelectedId}
        onClose={() => setIsLightboxOpen(false)}
        previewUrl={selectedPreviewItem?.previewUrl ?? null}
      />
    </Card>
  );
}
