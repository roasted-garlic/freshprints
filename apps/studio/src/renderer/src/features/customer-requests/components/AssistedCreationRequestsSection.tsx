import { useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";

import {
  formatAssistedCreationStatus,
  type AssistedCreationStatus,
} from "@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants";
import type {
  AssistedCreationProof,
  AssistedCreationRevisionEntry,
} from "@fresh-prints/shared/types/assistedCreation/assistedCreation.types";
import {
  countUnreadAssistedCreationCustomerUpdates,
  isAssistedCreationCustomerUpdateEntry,
  isAssistedCreationProofEmailSentEntry,
  latestAssistedCreationCustomerUpdateAtMs,
} from "@fresh-prints/shared/utils/assistedCreationHistory";

import { useAuth } from "../../auth/hooks/useAuth";
import { Button } from "../../../shared/components/Button";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "../../../shared/components/Modal";
import { desktopAppService } from "../../../shared/services/desktopAppService";
import { useAssistedCreationRequests } from "../hooks/useAssistedCreationRequests";
import {
  assistedCreationRequestsService,
  type AssistedCreationRequestListItem,
} from "../services/assistedCreationRequestsService";
import { assistedCreationUpdateAckService } from "../services/assistedCreationUpdateAckService";
import {
  joinLabeledValues,
  labelForComposition,
  labelForContainsText,
  labelForExactRequirement,
  labelForFlexibility,
  labelForPersonalization,
  labelForRequestType,
  labelForStyle,
} from "../utils/assistedCreationLabels";

type AssistedStageTab = "new" | "in_progress" | "revisions" | "proof_ready" | "completed";

const STAGE_TABS: ReadonlyArray<{ id: AssistedStageTab; label: string }> = [
  { id: "new", label: "New" },
  { id: "in_progress", label: "In progress" },
  { id: "revisions", label: "Revisions" },
  { id: "proof_ready", label: "Proof ready" },
  { id: "completed", label: "Completed" },
];

const STAGE_STATUSES: Record<AssistedStageTab, readonly AssistedCreationStatus[]> = {
  new: ["submitted"],
  in_progress: ["in_progress"],
  revisions: ["revision_requested"],
  proof_ready: ["proof_ready"],
  completed: ["approved", "rejected", "cancelled"],
};

interface AssistedMediaPreview {
  id: string;
  url: string;
  fileName: string;
  storagePath: string;
}

interface AssistedProofPreview extends AssistedMediaPreview {
  number: number;
  note?: string;
  createdAt: unknown;
  createdBy: string;
  relatedNotes: string[];
}

async function downloadAssistedMediaFile(url: string, fileName: string): Promise<"saved" | "canceled"> {
  return desktopAppService.downloadUrlToFile(url, fileName);
}

function formatCreatedAt(value: Date | null): string {
  if (!value) {
    return "Unknown time";
  }
  return value.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function toMillis(value: unknown): number {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().getTime();
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.getTime();
    }
  }
  return 0;
}

function formatHistoryAt(value: unknown): string {
  const millis = toMillis(value);
  if (!millis) {
    return "";
  }
  return formatCreatedAt(new Date(millis));
}

function isBoilerplateHistoryNote(note: string): boolean {
  const trimmed = note.trim();
  if (!trimmed) {
    return true;
  }
  return (
    trimmed === "Request submitted" ||
    /^Staff action:\s*/i.test(trimmed) ||
    trimmed === "Started work" ||
    trimmed === "Resumed work" ||
    trimmed === "Rejected" ||
    trimmed === "Cancelled" ||
    trimmed === "Customer approved proof"
  );
}

function statusTone(status: AssistedCreationStatus): string {
  switch (status) {
    case "submitted":
      return "is-submitted";
    case "in_progress":
    case "revision_requested":
      return "is-progress";
    case "proof_ready":
      return "is-proof";
    case "approved":
      return "is-approved";
    case "rejected":
    case "cancelled":
      return "is-closed";
    default:
      return "";
  }
}

function stageForStatus(status: AssistedCreationStatus): AssistedStageTab {
  if (STAGE_STATUSES.new.includes(status)) {
    return "new";
  }
  if (STAGE_STATUSES.in_progress.includes(status)) {
    return "in_progress";
  }
  if (STAGE_STATUSES.revisions.includes(status)) {
    return "revisions";
  }
  if (STAGE_STATUSES.proof_ready.includes(status)) {
    return "proof_ready";
  }
  return "completed";
}

function relatedNotesForProof(
  proof: AssistedCreationProof,
  proofs: AssistedCreationProof[],
  history: AssistedCreationRevisionEntry[],
): string[] {
  const start = toMillis(proof.createdAt);
  const index = proofs.findIndex((entry) => entry.id === proof.id);
  const next = index >= 0 ? proofs[index + 1] : undefined;
  const end = next ? toMillis(next.createdAt) : Number.POSITIVE_INFINITY;
  return history
    .filter((entry) => {
      const at = toMillis(entry.at);
      if (at < start || at >= end) {
        return false;
      }
      const note = entry.note?.trim() ?? "";
      return note.length > 0 && !isBoilerplateHistoryNote(note);
    })
    .map((entry) => {
      const when = formatHistoryAt(entry.at);
      const who =
        entry.byRole === "customer"
          ? "Customer"
          : entry.byRole === "staff"
            ? "Staff"
            : "System";
      return `${who}${when ? ` · ${when}` : ""}: ${entry.note.trim()}`;
    });
}

function AnswerRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) {
    return null;
  }
  return (
    <div className="customer-requests-etsy-detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function AssistedMediaThumb({
  downloading,
  media,
  onDownload,
}: {
  downloading: boolean;
  media: AssistedMediaPreview;
  onDownload: (media: AssistedMediaPreview) => void;
}) {
  return (
    <div className="customer-requests-assisted-thumb">
      <a href={media.url} rel="noreferrer" target="_blank" title="Open full size">
        <img alt={media.fileName || "Reference"} src={media.url} />
      </a>
      <button
        aria-label={`Download ${media.fileName || "reference image"}`}
        className="customer-requests-assisted-thumb-download"
        disabled={downloading}
        onClick={() => onDownload(media)}
        type="button"
      >
        <Download aria-hidden="true" size={14} strokeWidth={2.25} />
        Download
      </button>
    </div>
  );
}

function StaffReasonModal({
  actionLabel,
  busy,
  confirmLabel,
  onCancel,
  onConfirm,
  reason,
  setReason,
  title,
}: {
  actionLabel: string;
  busy: boolean;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  reason: string;
  setReason: (value: string) => void;
  title: string;
}) {
  return (
    <div
      aria-modal="true"
      className="modal-overlay modal-overlay-blur"
      onClick={onCancel}
      role="dialog"
    >
      <Modal
        aria-labelledby="assisted-staff-reason-title"
        className="customer-requests-assisted-proof-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <ModalHeader>
          <h2 id="assisted-staff-reason-title">{title}</h2>
        </ModalHeader>
        <ModalBody>
          <p className="settings-field-hint">{actionLabel}</p>
          <label className="form-field">
            <span>Reason (required)</span>
            <textarea
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              value={reason}
            />
          </label>
        </ModalBody>
        <ModalFooter>
          <Button disabled={busy} onClick={onCancel} variant="secondary">
            Keep request
          </Button>
          <Button
            disabled={busy || reason.trim().length === 0}
            onClick={onConfirm}
            variant="danger"
          >
            {confirmLabel}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

function AssistedProofDetailModal({
  downloading,
  onClose,
  onDownload,
  proof,
}: {
  downloading: boolean;
  onClose: () => void;
  onDownload: (media: AssistedMediaPreview) => void;
  proof: AssistedProofPreview;
}) {
  return (
    <div
      aria-modal="true"
      className="modal-overlay modal-overlay-blur"
      onClick={onClose}
      role="dialog"
    >
      <Modal
        aria-labelledby="assisted-proof-detail-title"
        className="customer-requests-assisted-proof-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <ModalHeader>
          <h2 id="assisted-proof-detail-title">Proof {proof.number}</h2>
        </ModalHeader>
        <ModalBody>
          <div className="customer-requests-assisted-proof-modal-image">
            <img alt={proof.fileName || `Proof ${proof.number}`} src={proof.url} />
          </div>
          <dl className="customer-requests-etsy-detail-summary">
            <AnswerRow label="File" value={proof.fileName} />
            <AnswerRow label="Submitted" value={formatHistoryAt(proof.createdAt)} />
            <AnswerRow
              label="Submitted by"
              value={proof.createdBy ? `Staff · ${proof.createdBy}` : "Staff"}
            />
          </dl>
          {proof.relatedNotes.length > 0 ? (
            <div className="customer-requests-assisted-proof-modal-notes">
              <h3>Linked notes</h3>
              <ul>
                {proof.relatedNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="settings-field-hint">No customer or follow-up notes tied to this proof.</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            disabled={downloading}
            onClick={() => onDownload(proof)}
            variant="secondary"
          >
            Download
          </Button>
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

function AssistedDetail({
  canMutate,
  canRestore,
  item,
  onHistoryExpanded,
  onToast,
  unreadUpdateCount,
}: {
  canMutate: boolean;
  canRestore: boolean;
  item: AssistedCreationRequestListItem;
  onHistoryExpanded: () => void;
  onToast: (message: string) => void;
  unreadUpdateCount: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofNote, setProofNote] = useState("");
  const [staffNotes, setStaffNotes] = useState(item.staffNotes);
  const [refMedia, setRefMedia] = useState<AssistedMediaPreview[]>([]);
  const [proofMedia, setProofMedia] = useState<AssistedProofPreview[]>([]);
  const [selectedProofId, setSelectedProofId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pendingProofFile, setPendingProofFile] = useState<File | null>(null);
  const [pendingProofPreviewUrl, setPendingProofPreviewUrl] = useState<string | null>(null);
  const [reasonModal, setReasonModal] = useState<"reject" | "cancel" | "restore" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const answers = item.answers;

  useEffect(() => {
    setStaffNotes(item.staffNotes);
  }, [item.id, item.staffNotes]);

  useEffect(() => {
    return () => {
      if (pendingProofPreviewUrl) {
        URL.revokeObjectURL(pendingProofPreviewUrl);
      }
    };
  }, [pendingProofPreviewUrl]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const refs = await Promise.all(
        item.referenceImages.map(async (image) => {
          try {
            const url = await assistedCreationRequestsService.getDownloadUrl(image.storagePath);
            return {
              id: image.id,
              url,
              fileName: image.fileName || `reference-${image.id}`,
              storagePath: image.storagePath,
            } satisfies AssistedMediaPreview;
          } catch {
            return null;
          }
        }),
      );
      const proofs = await Promise.all(
        item.proofs.map(async (proof, index) => {
          try {
            const url = await assistedCreationRequestsService.getDownloadUrl(proof.storagePath);
            return {
              id: proof.id,
              url,
              fileName: proof.fileName || `proof-${proof.id}`,
              storagePath: proof.storagePath,
              number: index + 1,
              note: proof.note,
              createdAt: proof.createdAt,
              createdBy: proof.createdBy,
              relatedNotes: relatedNotesForProof(proof, item.proofs, item.revisionHistory),
            } satisfies AssistedProofPreview;
          } catch {
            return null;
          }
        }),
      );
      if (!cancelled) {
        setRefMedia(refs.filter((entry): entry is AssistedMediaPreview => entry != null));
        setProofMedia(proofs.filter((entry): entry is AssistedProofPreview => entry != null));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [item.id, item.proofs, item.referenceImages, item.revisionHistory]);

  async function handleDownload(media: AssistedMediaPreview): Promise<void> {
    setDownloadingId(media.id);
    setError(null);
    try {
      const outcome = await downloadAssistedMediaFile(media.url, media.fileName);
      if (outcome === "saved") {
        onToast(`Saved ${media.fileName}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download image.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDownloadAllReferences(): Promise<void> {
    if (refMedia.length === 0) {
      return;
    }
    setDownloadingId("all-refs");
    setError(null);
    try {
      let savedCount = 0;
      for (const media of refMedia) {
        const outcome = await downloadAssistedMediaFile(media.url, media.fileName);
        if (outcome === "saved") {
          savedCount += 1;
        }
      }
      if (savedCount > 0) {
        onToast(
          savedCount === 1
            ? `Saved ${refMedia[0]?.fileName ?? "reference"}`
            : `Saved ${savedCount} reference images`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download images.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function runAction(
    action: "start_work" | "resume_work" | "reject" | "cancel" | "restore",
    reason?: string,
  ): Promise<void> {
    if (action === "restore") {
      if (!canRestore) {
        return;
      }
    } else if (!canMutate) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await assistedCreationRequestsService.updateStatus({
        requestId: item.id,
        action,
        staffNotes: staffNotes.trim() || undefined,
        reason: reason?.trim() || undefined,
      });
      const statusLabel =
        action === "reject"
          ? "rejected"
          : action === "cancel"
            ? "cancelled"
            : action === "restore"
              ? "submitted"
              : "in_progress";
      onToast(`Updated to ${formatAssistedCreationStatus(statusLabel)}`);
      setReasonModal(null);
      setActionReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status.");
    } finally {
      setBusy(false);
    }
  }

  function clearPendingProof(): void {
    if (pendingProofPreviewUrl) {
      URL.revokeObjectURL(pendingProofPreviewUrl);
    }
    setPendingProofFile(null);
    setPendingProofPreviewUrl(null);
    setProofNote("");
  }

  async function submitPendingProof(): Promise<void> {
    if (!pendingProofFile || !canMutate) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await assistedCreationRequestsService.uploadAndAttachProof({
        requestId: item.id,
        customerUid: item.customerUid,
        file: pendingProofFile,
        note: proofNote.trim() || undefined,
      });
      clearPendingProof();
      onToast("Proof submitted to customer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit proof.");
    } finally {
      setBusy(false);
    }
  }

  const description = answers?.rawDescription?.trim() || "No description";
  const isDownloading = downloadingId != null;
  const historyEntries = item.revisionHistory
    .slice()
    .reverse()
    .map((entry, index) => {
      const note = entry.note?.trim() ?? "";
      const showNote = note.length > 0 && !isBoilerplateHistoryNote(note);
      const isCustomerUpdate = isAssistedCreationCustomerUpdateEntry(entry);
      const isProofEmailSent = isAssistedCreationProofEmailSentEntry(entry);
      return {
        key: `${entry.toStatus}-${index}`,
        title: isCustomerUpdate
          ? "Updated"
          : isProofEmailSent
            ? "Email sent"
            : formatAssistedCreationStatus(entry.toStatus),
        when: formatHistoryAt(entry.at),
        note: showNote ? note : null,
        byRole: entry.byRole,
      };
    });
  const selectedProof = proofMedia.find((proof) => proof.id === selectedProofId) ?? null;

  return (
    <div className="customer-requests-assisted-detail">
      <header className="customer-requests-assisted-detail-header">
        <div className="customer-requests-assisted-detail-heading">
          <h2 className="customer-requests-etsy-detail-title">{item.customerDisplayName}</h2>
          <span className={`customer-requests-assisted-status-badge ${statusTone(item.status)}`}>
            {item.statusLabel}
          </span>
        </div>
        <p className="settings-field-hint">{formatCreatedAt(item.createdAt)}</p>
      </header>

      <div className="customer-requests-assisted-detail-grid">
        <div className="customer-requests-assisted-detail-main">
          <section className="customer-requests-assisted-panel">
            <h3 className="customer-requests-assisted-panel-title">Brief</h3>
            <p className="customer-requests-assisted-brief">{description}</p>
          </section>

          <section className="customer-requests-assisted-panel">
            <h3 className="customer-requests-assisted-panel-title">Request details</h3>
            <dl className="customer-requests-etsy-detail-summary">
              <AnswerRow
                label="Request type"
                value={answers?.requestType ? labelForRequestType(answers.requestType) : ""}
              />
              <AnswerRow
                label="Wording"
                value={answers?.containsText ? labelForContainsText(answers.containsText) : ""}
              />
              <AnswerRow label="Exact text" value={answers?.exactText ?? ""} />
              <AnswerRow label="Primary subject" value={answers?.primarySubject ?? ""} />
              <AnswerRow label="Occasion" value={answers?.occasion ?? ""} />
              <AnswerRow label="Audience" value={answers?.audience ?? ""} />
              <AnswerRow
                label="Personalization"
                value={joinLabeledValues(answers?.personalizationTypes, labelForPersonalization)}
              />
              <AnswerRow
                label="Flexibility"
                value={
                  answers?.flexibilityLevel ? labelForFlexibility(answers.flexibilityLevel) : ""
                }
              />
              <AnswerRow
                label="Must match references"
                value={joinLabeledValues(answers?.exactRequirements, labelForExactRequirement)}
              />
              <AnswerRow
                label="Styles"
                value={joinLabeledValues(answers?.stylePreferences, labelForStyle)}
              />
              <AnswerRow label="Mood" value={answers?.mood ?? ""} />
              <AnswerRow label="Colors include" value={answers?.includedColors ?? ""} />
              <AnswerRow label="Colors avoid" value={answers?.excludedColors ?? ""} />
              <AnswerRow label="Garment" value={answers?.garmentColor ?? ""} />
              <AnswerRow
                label="Composition"
                value={answers?.composition ? labelForComposition(answers.composition) : ""}
              />
            </dl>
          </section>
        </div>

        <aside className="customer-requests-assisted-detail-side">
          <section className="customer-requests-assisted-panel">
            <div className="customer-requests-assisted-panel-header">
              <h3 className="customer-requests-assisted-panel-title">Reference images</h3>
              {refMedia.length > 0 ? (
                <Button
                  disabled={isDownloading}
                  onClick={() => void handleDownloadAllReferences()}
                  size="sm"
                  variant="secondary"
                >
                  {downloadingId === "all-refs"
                    ? "Downloading…"
                    : refMedia.length === 1
                      ? "Download"
                      : "Download all"}
                </Button>
              ) : null}
            </div>
            {refMedia.length > 0 ? (
              <div className="customer-requests-assisted-thumbs">
                {refMedia.map((media) => (
                  <AssistedMediaThumb
                    downloading={isDownloading}
                    key={media.id}
                    media={media}
                    onDownload={(entry) => void handleDownload(entry)}
                  />
                ))}
              </div>
            ) : (
              <p className="settings-field-hint">No reference images.</p>
            )}
          </section>

          <section className="customer-requests-assisted-panel">
            <h3 className="customer-requests-assisted-panel-title">Proofs</h3>
            {proofMedia.length > 0 ? (
              <div className="customer-requests-assisted-proof-list">
                {proofMedia.map((proof) => (
                  <button
                    className="customer-requests-assisted-proof-row"
                    key={proof.id}
                    onClick={() => setSelectedProofId(proof.id)}
                    type="button"
                  >
                    <img alt="" src={proof.url} />
                    <span className="customer-requests-assisted-proof-row-body">
                      <strong>Proof {proof.number}</strong>
                      <span>{formatHistoryAt(proof.createdAt) || "Unknown time"}</span>
                      {proof.note?.trim() ? <span>{proof.note.trim()}</span> : null}
                      {proof.relatedNotes.length > 0 ? (
                        <span>
                          {proof.relatedNotes.length} linked note
                          {proof.relatedNotes.length === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="settings-field-hint">No proofs uploaded yet.</p>
            )}
          </section>

          {historyEntries.length > 0 ? (
            <details
              className="customer-requests-assisted-panel customer-requests-assisted-history-disclosure"
              onToggle={(event) => {
                if (event.currentTarget.open) {
                  onHistoryExpanded();
                }
              }}
            >
              <summary className="customer-requests-assisted-panel-title">
                History ({historyEntries.length})
                {unreadUpdateCount > 0 ? (
                  <span
                    aria-label={`${unreadUpdateCount} unread customer update${unreadUpdateCount === 1 ? "" : "s"}`}
                    className="customer-requests-assisted-unread-badge"
                  >
                    {unreadUpdateCount}
                  </span>
                ) : null}
              </summary>
              <ol className="customer-requests-assisted-history">
                {historyEntries.map((entry) => (
                  <li key={entry.key}>
                    <strong>{entry.title}</strong>
                    {entry.when ? <span>{entry.when}</span> : null}
                    <span className="customer-requests-assisted-history-role">{entry.byRole}</span>
                    {entry.note ? <span>{entry.note}</span> : null}
                  </li>
                ))}
              </ol>
            </details>
          ) : null}

          <section className="customer-requests-assisted-panel customer-requests-assisted-actions">
            <h3 className="customer-requests-assisted-panel-title">Staff actions</h3>
            {canMutate ? (
              <>
                <label className="form-field">
                  <span>Internal staff notes</span>
                  <textarea
                    onChange={(event) => setStaffNotes(event.target.value)}
                    rows={3}
                    value={staffNotes}
                  />
                </label>

                <div className="customer-requests-assisted-action-row">
                  {item.status === "submitted" ? (
                    <Button disabled={busy} onClick={() => void runAction("start_work")}>
                      Start work
                    </Button>
                  ) : null}
                  {item.status === "revision_requested" ? (
                    <Button disabled={busy} onClick={() => void runAction("resume_work")}>
                      Resume revision
                    </Button>
                  ) : null}
                  {item.status === "submitted" || item.status === "in_progress" ? (
                    <Button
                      disabled={busy}
                      onClick={() => {
                        setActionReason("");
                        setReasonModal("reject");
                      }}
                      variant="danger"
                    >
                      Reject
                    </Button>
                  ) : null}
                  {item.status !== "approved" &&
                  item.status !== "rejected" &&
                  item.status !== "cancelled" ? (
                    <Button
                      disabled={busy}
                      onClick={() => {
                        setActionReason("");
                        setReasonModal("cancel");
                      }}
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                  ) : null}
                  {item.status === "cancelled" && canRestore ? (
                    <Button
                      disabled={busy}
                      onClick={() => {
                        setActionReason("");
                        setReasonModal("restore");
                      }}
                    >
                      Restore…
                    </Button>
                  ) : null}
                </div>

                {item.status === "in_progress" ? (
                  <div className="customer-requests-assisted-proof-upload">
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="visually-hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) {
                          return;
                        }
                        if (pendingProofPreviewUrl) {
                          URL.revokeObjectURL(pendingProofPreviewUrl);
                        }
                        setPendingProofFile(file);
                        setPendingProofPreviewUrl(URL.createObjectURL(file));
                        setError(null);
                      }}
                      ref={fileInputRef}
                      type="file"
                    />
                    {!pendingProofFile ? (
                      <Button disabled={busy} onClick={() => fileInputRef.current?.click()}>
                        Choose proof image
                      </Button>
                    ) : (
                      <div className="customer-requests-assisted-proof-pending">
                        {pendingProofPreviewUrl ? (
                          <div className="customer-requests-assisted-proof-pending-preview">
                            <img alt="Pending proof preview" src={pendingProofPreviewUrl} />
                          </div>
                        ) : null}
                        <p
                          className="customer-requests-assisted-proof-pending-name"
                          title={pendingProofFile.name}
                        >
                          {pendingProofFile.name}
                        </p>
                        <label className="form-field">
                          <span>Proof note (optional)</span>
                          <input
                            onChange={(event) => setProofNote(event.target.value)}
                            type="text"
                            value={proofNote}
                          />
                        </label>
                        <div className="customer-requests-assisted-action-row">
                          <Button
                            disabled={busy}
                            onClick={clearPendingProof}
                            variant="secondary"
                          >
                            Clear
                          </Button>
                          <Button disabled={busy} onClick={() => void submitPendingProof()}>
                            Submit to customer
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="settings-field-hint">
                Helpers can view requests but not change status or send proofs.
              </p>
            )}
          </section>
        </aside>
      </div>

      {error ? (
        <p className="auth-message auth-message-error" role="alert">
          {error}
        </p>
      ) : null}

      {selectedProof ? (
        <AssistedProofDetailModal
          downloading={isDownloading}
          onClose={() => setSelectedProofId(null)}
          onDownload={(entry) => void handleDownload(entry)}
          proof={selectedProof}
        />
      ) : null}

      {reasonModal === "reject" ? (
        <StaffReasonModal
          actionLabel="This rejects the request permanently. Explain why for the audit trail."
          busy={busy}
          confirmLabel="Reject request"
          onCancel={() => {
            setReasonModal(null);
            setActionReason("");
          }}
          onConfirm={() => void runAction("reject", actionReason)}
          reason={actionReason}
          setReason={setActionReason}
          title="Reject request"
        />
      ) : null}

      {reasonModal === "cancel" ? (
        <StaffReasonModal
          actionLabel="This closes the request as cancelled. The customer will need a new request afterward."
          busy={busy}
          confirmLabel="Cancel request"
          onCancel={() => {
            setReasonModal(null);
            setActionReason("");
          }}
          onConfirm={() => void runAction("cancel", actionReason)}
          reason={actionReason}
          setReason={setActionReason}
          title="Cancel request"
        />
      ) : null}

      {reasonModal === "restore" ? (
        <StaffReasonModal
          actionLabel="Restores this cancelled request to New (submitted) so staff can work it again."
          busy={busy}
          confirmLabel="Restore request"
          onCancel={() => {
            setReasonModal(null);
            setActionReason("");
          }}
          onConfirm={() => void runAction("restore", actionReason)}
          reason={actionReason}
          setReason={setActionReason}
          title="Restore cancelled request"
        />
      ) : null}
    </div>
  );
}

export function AssistedCreationRequestsSection({
  canMutate,
  canRestore,
  onToast,
}: {
  canMutate: boolean;
  canRestore: boolean;
  onToast: (message: string) => void;
}) {
  const { user } = useAuth();
  const { items, isLoading, error } = useAssistedCreationRequests();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<AssistedStageTab>("new");
  const [ackByRequestId, setAckByRequestId] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user?.id) {
      setAckByRequestId({});
      return;
    }
    return assistedCreationUpdateAckService.subscribe(
      user.id,
      (records) => {
        const next: Record<string, number> = {};
        for (const record of records) {
          next[record.requestId] = record.readThroughAtMillis;
        }
        setAckByRequestId(next);
      },
    );
  }, [user?.id]);

  const unreadByRequestId = useMemo(() => {
    const next: Record<string, number> = {};
    for (const item of items) {
      next[item.id] = countUnreadAssistedCreationCustomerUpdates(
        item.revisionHistory,
        ackByRequestId[item.id] ?? null,
      );
    }
    return next;
  }, [ackByRequestId, items]);

  const unreadByStage = useMemo(() => {
    const next: Record<AssistedStageTab, number> = {
      new: 0,
      in_progress: 0,
      revisions: 0,
      proof_ready: 0,
      completed: 0,
    };
    for (const item of items) {
      const unread = unreadByRequestId[item.id] ?? 0;
      if (unread > 0) {
        next[stageForStatus(item.status)] += unread;
      }
    }
    return next;
  }, [items, unreadByRequestId]);

  const counts = useMemo(() => {
    const next: Record<AssistedStageTab, number> = {
      new: 0,
      in_progress: 0,
      revisions: 0,
      proof_ready: 0,
      completed: 0,
    };
    for (const item of items) {
      next[stageForStatus(item.status)] += 1;
    }
    return next;
  }, [items]);

  const visibleItems = useMemo(
    () => items.filter((item) => stageForStatus(item.status) === activeStage),
    [activeStage, items],
  );

  const selected = useMemo(
    () => visibleItems.find((item) => item.id === selectedId) ?? visibleItems[0] ?? null,
    [selectedId, visibleItems],
  );

  useEffect(() => {
    if (visibleItems.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !visibleItems.some((item) => item.id === selectedId)) {
      setSelectedId(visibleItems[0]?.id ?? null);
    }
  }, [selectedId, visibleItems]);

  async function markRequestHistoryRead(item: AssistedCreationRequestListItem): Promise<void> {
    if (!user?.id) {
      return;
    }
    const latestAt = latestAssistedCreationCustomerUpdateAtMs(item.revisionHistory);
    if (latestAt == null) {
      return;
    }
    const current = ackByRequestId[item.id] ?? null;
    if (current != null && current >= latestAt) {
      return;
    }
    try {
      await assistedCreationUpdateAckService.markReadThrough(user.id, item.id, latestAt);
    } catch {
      // Badge clear is best-effort; leave unread if write fails.
    }
  }

  return (
    <section
      aria-labelledby="assisted-creation-requests-title"
      className="card settings-section customer-requests-assisted"
    >
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="assisted-creation-requests-title">
          Assisted creation
        </h2>
        <p className="settings-section-description">
          Review Portal briefs, upload proofs, and move requests through the assisted creation
          workflow. To wipe test requests, use Test Data → Assisted Creation requests.
        </p>
      </header>

      {error ? (
        <p className="auth-message auth-message-error" role="alert">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="settings-section-status">Loading assisted creation requests…</p>
      ) : items.length === 0 && !error ? (
        <p className="settings-section-status">
          No assisted creation requests yet. Portal submissions will appear here.
        </p>
      ) : items.length > 0 ? (
        <>
          <div
            aria-label="Assisted creation stages"
            className="staff-inbox-page-tabs customer-requests-assisted-stage-tabs"
            role="tablist"
          >
            {STAGE_TABS.map((tab) => {
              const unread = unreadByStage[tab.id];
              return (
                <button
                  aria-selected={activeStage === tab.id}
                  className={`staff-inbox-page-tab${activeStage === tab.id ? " is-active" : ""}`}
                  key={tab.id}
                  onClick={() => setActiveStage(tab.id)}
                  role="tab"
                  type="button"
                >
                  {tab.label}
                  <span className="customer-requests-assisted-stage-count">{counts[tab.id]}</span>
                  {unread > 0 ? (
                    <span
                      aria-label={`${unread} unread customer update${unread === 1 ? "" : "s"}`}
                      className="customer-requests-assisted-unread-badge"
                    >
                      {unread}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {visibleItems.length === 0 ? (
            <p className="settings-section-status">No requests in this stage.</p>
          ) : (
            <div className="customer-requests-etsy-split">
              <div
                aria-label="Assisted creation requests"
                className="customer-requests-etsy-list"
                role="listbox"
              >
                {visibleItems.map((item) => {
                  const isSelected = item.id === selected?.id;
                  const unread = unreadByRequestId[item.id] ?? 0;
                  return (
                    <button
                      aria-selected={isSelected}
                      className={`customer-requests-etsy-list-card${isSelected ? " is-selected" : ""}`}
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      role="option"
                      type="button"
                    >
                      <span className="customer-requests-etsy-list-card-title">
                        {item.customerDisplayName}
                        {unread > 0 ? (
                          <span
                            aria-label={`${unread} unread customer update${unread === 1 ? "" : "s"}`}
                            className="customer-requests-assisted-unread-badge"
                          >
                            {unread}
                          </span>
                        ) : null}
                      </span>
                      <span className="customer-requests-etsy-list-card-meta">{item.statusLabel}</span>
                      <span className="customer-requests-etsy-list-card-meta">
                        {item.descriptionPreview || "No description"}
                      </span>
                      <span className="customer-requests-etsy-list-card-meta">
                        {formatCreatedAt(item.createdAt)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="customer-requests-etsy-detail-pane" aria-live="polite">
                {selected ? (
                  <AssistedDetail
                    canMutate={canMutate}
                    canRestore={canRestore}
                    item={selected}
                    onHistoryExpanded={() => {
                      void markRequestHistoryRead(selected);
                    }}
                    onToast={onToast}
                    unreadUpdateCount={unreadByRequestId[selected.id] ?? 0}
                  />
                ) : (
                  <p className="settings-section-status">Select a request to view details.</p>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
