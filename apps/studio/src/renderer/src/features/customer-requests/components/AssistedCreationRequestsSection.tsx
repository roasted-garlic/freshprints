import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Download } from "lucide-react";

import {
  ASSISTED_CREATION_FIELD_LIMITS,
  ASSISTED_CREATION_MESSAGE_MAX_LENGTH,
  ASSISTED_CREATION_MESSAGING_CLOSED_MESSAGE,
  canSendAssistedCreationMessage,
  formatAssistedCreationStatus,
  type AssistedCreationStatus,
} from "@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants";
import type {
  AssistedCreationProof,
  AssistedCreationRevisionEntry,
} from "@fresh-prints/shared/types/assistedCreation/assistedCreation.types";
import {
  ASSISTED_CREATION_PROOF_EMAIL_SENT_NOTE,
  assistedCreationRevisionAtMillis,
  buildAssistedCreationHistoryTitles,
  countUnreadAssistedCreationCustomerUpdates,
  isAssistedCreationCustomerUpdateUnread,
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
import { AssistedStaffOverflowMenu } from "./AssistedStaffOverflowMenu";
import {
  CUSTOMER_REQUEST_DETAIL_TAB_QUERY_PARAM,
  CUSTOMER_REQUEST_ID_QUERY_PARAM,
  isAssistedDetailRouteTab,
  type AssistedDetailRouteTab,
} from "../constants/customerRequestRoutes";
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
type AssistedDetailTab = "overview" | "proofs" | "messages";

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
  /** Staff proof note + linked history notes (excludes email system noise). */
  notes: string[];
  /** True when full-res Storage object is missing or purged. */
  unavailable: boolean;
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
    trimmed === "Customer approved proof" ||
    trimmed === ASSISTED_CREATION_PROOF_EMAIL_SENT_NOTE ||
    /^Proof-ready email sent/i.test(trimmed)
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
  const proofNote = proof.note?.trim() ?? "";
  return history
    .filter((entry) => {
      const at = toMillis(entry.at);
      if (at < start || at >= end) {
        return false;
      }
      if (isAssistedCreationProofEmailSentEntry(entry)) {
        return false;
      }
      const note = entry.note?.trim() ?? "";
      if (!note || isBoilerplateHistoryNote(note)) {
        return false;
      }
      // Same text as proof.note is already the staff proof note — don't double-list.
      if (proofNote && note === proofNote) {
        return false;
      }
      return true;
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

function noteBodyDedupeKey(formattedLine: string): string {
  const separator = formattedLine.indexOf(": ");
  const body = separator >= 0 ? formattedLine.slice(separator + 2) : formattedLine;
  return body.trim().toLowerCase();
}

/** Staff proof note + linked history notes for the proof detail Notes button. */
function notesForProof(
  proof: AssistedCreationProof,
  proofs: AssistedCreationProof[],
  history: AssistedCreationRevisionEntry[],
): string[] {
  const notes: string[] = [];
  const seenBodies = new Set<string>();
  const staffNote = proof.note?.trim() ?? "";
  if (staffNote) {
    seenBodies.add(staffNote.toLowerCase());
    const when = formatHistoryAt(proof.createdAt);
    notes.push(`Staff${when ? ` · ${when}` : ""}: ${staffNote}`);
  }
  for (const line of relatedNotesForProof(proof, proofs, history)) {
    const key = noteBodyDedupeKey(line);
    if (seenBodies.has(key)) {
      continue;
    }
    seenBodies.add(key);
    notes.push(line);
  }
  return notes;
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

function AssistedProofNotesModal({
  notes,
  onClose,
  title,
}: {
  notes: string[];
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      aria-modal="true"
      className="modal-overlay modal-overlay-blur customer-requests-assisted-proof-notes-overlay"
      onClick={onClose}
      role="dialog"
    >
      <Modal
        aria-labelledby="assisted-proof-notes-title"
        className="customer-requests-assisted-proof-notes-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <ModalHeader>
          <h2 id="assisted-proof-notes-title">{title}</h2>
        </ModalHeader>
        <ModalBody className="customer-requests-assisted-proof-notes-modal-body">
          <ul className="customer-requests-assisted-proof-notes-list">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

function AssistedProofDetailModal({
  downloading,
  isApprovedProof,
  isLatest,
  onClose,
  onDownload,
  proof,
}: {
  downloading: boolean;
  isApprovedProof: boolean;
  isLatest: boolean;
  onClose: () => void;
  onDownload: (media: AssistedMediaPreview) => void;
  proof: AssistedProofPreview;
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const noteCount = proof.notes.length;

  return (
    <>
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
            <h2 id="assisted-proof-detail-title">
              Proof {proof.number}
              {isLatest ? " (latest)" : ""}
            </h2>
          </ModalHeader>
          <ModalBody className="customer-requests-assisted-proof-modal-body">
            {proof.unavailable || !proof.url ? (
              <p className="settings-field-hint">Full-resolution file is no longer available.</p>
            ) : (
              <div className="customer-requests-assisted-proof-modal-image">
                <img alt={proof.fileName || `Proof ${proof.number}`} src={proof.url} />
              </div>
            )}
            <dl className="customer-requests-etsy-detail-summary">
              {isApprovedProof ? <AnswerRow label="Status" value="Approved proof" /> : null}
              <AnswerRow label="File" value={proof.fileName} />
              <AnswerRow label="Submitted" value={formatHistoryAt(proof.createdAt)} />
              <AnswerRow
                label="Submitted by"
                value={proof.createdBy ? `Staff · ${proof.createdBy}` : "Staff"}
              />
            </dl>
            <div className="customer-requests-assisted-proof-modal-actions">
              {noteCount > 0 ? (
                <Button onClick={() => setNotesOpen(true)} type="button" variant="secondary">
                  Notes
                </Button>
              ) : (
                <p className="settings-field-hint">No notes tied to this proof.</p>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              disabled={downloading || proof.unavailable || !proof.url}
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
      {notesOpen && noteCount > 0 ? (
        <AssistedProofNotesModal
          notes={proof.notes}
          onClose={() => setNotesOpen(false)}
          title={`Proof ${proof.number} · Notes`}
        />
      ) : null}
    </>
  );
}

function AssistedDetail({
  canMutate,
  canRestore,
  initialDetailTab = "overview",
  item,
  onMarkHistoryEntryRead,
  onToast,
  readThroughAtMs,
  unreadUpdateCount,
}: {
  canMutate: boolean;
  canRestore: boolean;
  initialDetailTab?: AssistedDetailTab;
  item: AssistedCreationRequestListItem;
  onMarkHistoryEntryRead: (entryAtMs: number) => void;
  onToast: (message: string) => void;
  readThroughAtMs: number | null;
  unreadUpdateCount: number;
}) {
  const [busy, setBusy] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofNote, setProofNote] = useState("");
  const [staffNotes, setStaffNotes] = useState(item.staffNotes);
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [refMedia, setRefMedia] = useState<AssistedMediaPreview[]>([]);
  const [proofMedia, setProofMedia] = useState<AssistedProofPreview[]>([]);
  const [selectedProofId, setSelectedProofId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pendingProofFile, setPendingProofFile] = useState<File | null>(null);
  const [pendingProofPreviewUrl, setPendingProofPreviewUrl] = useState<string | null>(null);
  const [reasonModal, setReasonModal] = useState<"reject" | "cancel" | "restore" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [activeDetailTab, setActiveDetailTab] = useState<AssistedDetailTab>("overview");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesPanelRef = useRef<HTMLSectionElement>(null);
  const messagesThreadRef = useRef<HTMLDivElement>(null);
  const answers = item.answers;

  useEffect(() => {
    setStaffNotes(item.staffNotes);
    setMessageDraft("");
    setMessageError(null);
  }, [item.id, item.staffNotes]);

  useEffect(() => {
    setActiveDetailTab(initialDetailTab);
  }, [item.id, initialDetailTab]);

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
          const base = {
            id: proof.id,
            fileName: proof.fileName || `proof-${proof.id}`,
            storagePath: proof.storagePath,
            number: index + 1,
            ...(proof.note ? { note: proof.note } : {}),
            createdAt: proof.createdAt,
            createdBy: proof.createdBy,
            notes: notesForProof(proof, item.proofs, item.revisionHistory),
          };
          if (proof.fullSizePurgedAt != null || !proof.storagePath?.trim()) {
            return {
              ...base,
              url: "",
              unavailable: true,
            } satisfies AssistedProofPreview;
          }
          try {
            const url = await assistedCreationRequestsService.getDownloadUrl(proof.storagePath);
            return {
              ...base,
              url,
              unavailable: false,
            } satisfies AssistedProofPreview;
          } catch {
            return {
              ...base,
              url: "",
              unavailable: true,
            } satisfies AssistedProofPreview;
          }
        }),
      );
      if (!cancelled) {
        setRefMedia(refs.filter((entry): entry is AssistedMediaPreview => entry != null));
        setProofMedia(proofs);
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

  async function saveStaffNotes(): Promise<void> {
    if (!canMutate || savingNotes) {
      return;
    }
    setSavingNotes(true);
    setBusy(true);
    setError(null);
    try {
      await assistedCreationRequestsService.updateStatus({
        requestId: item.id,
        action: "update_notes",
        staffNotes: staffNotes.trim(),
      });
      onToast("Staff notes saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save staff notes.");
    } finally {
      setSavingNotes(false);
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
        proofNumber: item.proofs.length + 1,
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

  async function handleSendMessage(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = messageDraft.trim();
    if (!trimmed || sendingMessage || !canMutate || !canSendAssistedCreationMessage(item.status)) {
      return;
    }
    setSendingMessage(true);
    setMessageError(null);
    try {
      await assistedCreationRequestsService.sendMessage({
        requestId: item.id,
        message: trimmed,
      });
      setMessageDraft("");
      onToast("Message sent");
      // Replying acknowledges unread customer updates (same effect as per-row Read).
      const latestCustomerAtMs = latestAssistedCreationCustomerUpdateAtMs(item.revisionHistory);
      if (latestCustomerAtMs != null) {
        onMarkHistoryEntryRead(latestCustomerAtMs);
      }
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : "Unable to send message.");
    } finally {
      setSendingMessage(false);
    }
  }

  const description = answers?.rawDescription?.trim() || "No description";
  const isDownloading = downloadingId != null;
  const notesDirty = staffNotes.trim() !== item.staffNotes.trim();
  const canReject =
    canMutate && (item.status === "submitted" || item.status === "in_progress");
  const canCancelRequest =
    canMutate &&
    item.status !== "approved" &&
    item.status !== "rejected" &&
    item.status !== "cancelled";
  const canShowRestore = item.status === "cancelled" && canRestore;
  const hasPrimaryActions =
    canMutate && (item.status === "submitted" || item.status === "revision_requested");
  const historyTitles = buildAssistedCreationHistoryTitles(item.revisionHistory);
  /** Chronological (oldest → newest) — matches Portal Messages. */
  const historyEntries = item.revisionHistory.map((entry, index) => {
    const note = entry.note?.trim() ?? "";
    const showNote = note.length > 0 && !isBoilerplateHistoryNote(note);
    const isUnread = isAssistedCreationCustomerUpdateUnread(entry, readThroughAtMs);
    const atMs = assistedCreationRevisionAtMillis(entry.at);
    const actor = entry.byRole ?? "system";
    return {
      key: `${entry.toStatus}-${index}`,
      title: historyTitles[index] ?? formatAssistedCreationStatus(entry.toStatus),
      when: formatHistoryAt(entry.at),
      note: showNote ? note : null,
      actor,
      roleLabel:
        actor === "customer" ? "Customer" : actor === "staff" ? "You" : "System",
      isUnread,
      atMs,
    };
  });

  useEffect(() => {
    if (activeDetailTab !== "messages") {
      return;
    }

    let cancelled = false;
    let secondFrame = 0;

    const scrollMessagesIntoView = (): void => {
      if (cancelled) {
        return;
      }
      const panel = messagesPanelRef.current;
      const thread = messagesThreadRef.current;
      // Bring the Messages panel into the page scrollport (deep-link often lands mid-page).
      panel?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      if (thread) {
        thread.scrollTop = thread.scrollHeight;
      }
    };

    // Double rAF: wait until the Messages tab (and thread max-height) has painted.
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(scrollMessagesIntoView);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [activeDetailTab, historyEntries.length, item.id]);

  const proofMediaNewestFirst = [...proofMedia].sort(
    (a, b) => toMillis(b.createdAt) - toMillis(a.createdAt),
  );
  const selectedProof =
    proofMediaNewestFirst.find((proof) => proof.id === selectedProofId) ?? null;

  return (
    <div className="customer-requests-assisted-detail">
      <header className="customer-requests-assisted-detail-header">
        <div className="customer-requests-assisted-detail-heading">
          <h2 className="customer-requests-etsy-detail-title">{item.customerDisplayName}</h2>
          <div className="customer-requests-assisted-status-header-actions">
            <span className={`customer-requests-assisted-status-badge ${statusTone(item.status)}`}>
              {item.statusLabel}
            </span>
            <AssistedStaffOverflowMenu
              canCancel={canCancelRequest}
              canReject={canReject}
              canRestore={canShowRestore}
              disabled={busy}
              onCancel={() => {
                setActionReason("");
                setReasonModal("cancel");
              }}
              onReject={() => {
                setActionReason("");
                setReasonModal("reject");
              }}
              onRestore={() => {
                setActionReason("");
                setReasonModal("restore");
              }}
            />
          </div>
        </div>
        <p className="settings-field-hint">{formatCreatedAt(item.createdAt)}</p>
        {item.status === "cancelled" && item.customerCancelReason ? (
          <p className="settings-field-hint customer-requests-assisted-cancel-reason">
            <strong>Customer cancel reason:</strong> {item.customerCancelReason}
          </p>
        ) : null}
      </header>

      <div
        aria-label="Request sections"
        className="customer-requests-assisted-detail-tabs"
        role="tablist"
      >
        {(["overview", "proofs", "messages"] as const).map((tab) => (
          <button
            aria-selected={activeDetailTab === tab}
            className={`customer-requests-assisted-detail-tab${
              activeDetailTab === tab ? " is-active" : ""
            }`}
            key={tab}
            onClick={() => setActiveDetailTab(tab)}
            role="tab"
            type="button"
          >
            {tab === "overview" ? "Overview" : tab === "proofs" ? "Proofs" : "Messages"}
          </button>
        ))}
      </div>

      <div className="customer-requests-assisted-detail-grid" role="tabpanel">
        {activeDetailTab === "overview" ? (
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
        ) : null}

        <aside
          className={`customer-requests-assisted-detail-side${
            activeDetailTab === "overview" ? "" : " is-full-width"
          }`}
        >
          {activeDetailTab === "overview" ? (
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
          ) : null}

          {activeDetailTab === "overview" ? (
            <>
              {canMutate ? (
                <section className="customer-requests-assisted-panel customer-requests-assisted-notes">
                  <h3 className="customer-requests-assisted-panel-title">
                    Internal staff notes
                  </h3>
                  <p className="settings-field-hint">
                    Internal only — not shown to the customer in Messages. Click Save notes to
                    keep changes.
                  </p>
                  <label className="form-field">
                    <span className="visually-hidden">Internal staff notes</span>
                    <textarea
                      maxLength={ASSISTED_CREATION_FIELD_LIMITS.staffNote}
                      onChange={(event) => setStaffNotes(event.target.value)}
                      rows={4}
                      value={staffNotes}
                    />
                  </label>
                  <div className="customer-requests-assisted-notes-footer">
                    <span className="settings-field-hint" aria-live="polite">
                      {savingNotes
                        ? "Saving…"
                        : notesDirty
                          ? "Unsaved changes"
                          : "Saved"}
                      {" · "}
                      {staffNotes.length}/{ASSISTED_CREATION_FIELD_LIMITS.staffNote}
                    </span>
                    <Button
                      disabled={busy || !notesDirty}
                      onClick={() => void saveStaffNotes()}
                      size="sm"
                      variant="primary"
                    >
                      {savingNotes ? "Saving…" : "Save notes"}
                    </Button>
                  </div>
                </section>
              ) : null}

              {hasPrimaryActions ? (
                <section className="customer-requests-assisted-panel customer-requests-assisted-actions">
                  <h3 className="customer-requests-assisted-panel-title">Staff actions</h3>
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
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          {activeDetailTab === "proofs" ? (
            <section className="customer-requests-assisted-panel">
            <h3 className="customer-requests-assisted-panel-title">Proofs</h3>
            {proofMediaNewestFirst.length > 0 ? (
              <ul className="customer-requests-assisted-proof-list">
                {proofMediaNewestFirst.map((proof, index) => {
                  const isLatest = index === 0;
                  const isApprovedProof = item.approvedProofId === proof.id;
                  const metaBits: string[] = [];
                  if (isApprovedProof) {
                    metaBits.push("Approved");
                  }
                  if (proof.unavailable) {
                    metaBits.push("File removed");
                  }
                  if (proof.notes.length > 0) {
                    metaBits.push("Notes");
                  }
                  return (
                    <li key={proof.id}>
                      <button
                        className="customer-requests-assisted-proof-row"
                        onClick={() => setSelectedProofId(proof.id)}
                        type="button"
                      >
                        {proof.unavailable || !proof.url ? (
                          <span
                            aria-hidden="true"
                            className="customer-requests-assisted-proof-row-placeholder"
                          />
                        ) : (
                          <img
                            alt=""
                            src={proof.url}
                          />
                        )}
                        <span className="customer-requests-assisted-proof-row-body">
                          <span className="customer-requests-assisted-proof-row-title">
                            Proof {proof.number}
                            {isLatest ? " (latest)" : ""}
                          </span>
                          <span className="customer-requests-assisted-proof-row-meta">
                            {formatHistoryAt(proof.createdAt) || "Unknown time"}
                            {metaBits.length > 0 ? ` · ${metaBits.join(" · ")}` : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="settings-field-hint">No proofs uploaded yet.</p>
            )}

            {canMutate && item.status === "in_progress" ? (
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
                      <textarea
                        className="customer-requests-assisted-proof-note-input"
                        onChange={(event) => setProofNote(event.target.value)}
                        placeholder="Optional note for the customer"
                        rows={5}
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
            </section>
          ) : null}

          {activeDetailTab === "messages" ? (
            <section
              className="customer-requests-assisted-panel"
              data-assisted-messages-panel="true"
              ref={messagesPanelRef}
            >
              <h3 className="customer-requests-assisted-panel-title">
                Messages ({historyEntries.length})
                {unreadUpdateCount > 0 ? (
                  <span
                    aria-label={`${unreadUpdateCount} unread customer update${unreadUpdateCount === 1 ? "" : "s"}`}
                    className="customer-requests-assisted-unread-badge"
                  >
                    {unreadUpdateCount}
                  </span>
                ) : null}
              </h3>
              <div
                aria-label="Request messages"
                className="customer-requests-assisted-messages-thread"
                ref={messagesThreadRef}
                tabIndex={0}
              >
              {historyEntries.length > 0 ? (
                <ol className="customer-requests-assisted-history-chat">
                  {historyEntries.map((entry) => (
                    <li
                      className={[
                        "customer-requests-assisted-history-chat-row",
                        `is-${entry.actor}`,
                        entry.isUnread ? "is-unread" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={entry.key}
                    >
                      <div className="customer-requests-assisted-history-chat-meta">
                        <span className="customer-requests-assisted-history-chat-role">
                          {entry.roleLabel}
                        </span>
                        {entry.when ? (
                          <span className="customer-requests-assisted-history-chat-when">
                            {entry.when}
                          </span>
                        ) : null}
                        {entry.isUnread && entry.atMs != null ? (
                          <button
                            className="link-button customer-requests-assisted-history-read"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              if (entry.atMs != null) {
                                onMarkHistoryEntryRead(entry.atMs);
                              }
                            }}
                            type="button"
                          >
                            Read
                          </button>
                        ) : null}
                      </div>
                      <div className="customer-requests-assisted-history-chat-bubble">
                        <strong className="customer-requests-assisted-history-chat-title">
                          {entry.title}
                        </strong>
                        {entry.note ? (
                          <p className="customer-requests-assisted-history-chat-note">{entry.note}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="settings-field-hint">No messages yet.</p>
              )}
              </div>
              {canMutate && canSendAssistedCreationMessage(item.status) ? (
                <form
                  className="customer-requests-assisted-message-composer"
                  onSubmit={(event) => void handleSendMessage(event)}
                >
                  <label
                    className="customer-requests-assisted-message-label"
                    htmlFor={`assisted-staff-message-${item.id}`}
                  >
                    Send a message
                  </label>
                  <textarea
                    aria-describedby={`assisted-staff-message-help-${item.id}`}
                    className="customer-requests-assisted-message-input"
                    disabled={sendingMessage}
                    id={`assisted-staff-message-${item.id}`}
                    maxLength={ASSISTED_CREATION_MESSAGE_MAX_LENGTH}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") {
                        return;
                      }
                      event.preventDefault();
                      if (sendingMessage || !messageDraft.trim() || !canMutate) {
                        return;
                      }
                      event.currentTarget.form?.requestSubmit();
                    }}
                    placeholder="Message the customer"
                    rows={3}
                    value={messageDraft}
                  />
                  <div className="customer-requests-assisted-message-composer-meta">
                    <span
                      className="settings-field-hint"
                      id={`assisted-staff-message-help-${item.id}`}
                    >
                      Messaging does not change or reopen the request status. Internal notes stay
                      on Overview.
                    </span>
                    <span className="settings-field-hint">
                      {messageDraft.length}/{ASSISTED_CREATION_MESSAGE_MAX_LENGTH}
                    </span>
                  </div>
                  {messageError ? (
                    <p className="auth-message auth-message-error" role="alert">
                      {messageError}
                    </p>
                  ) : null}
                  <div className="customer-requests-assisted-message-send-wrap">
                    <Button
                      disabled={sendingMessage || !messageDraft.trim()}
                      type="submit"
                    >
                      {sendingMessage ? "Sending…" : "Send"}
                    </Button>
                    <span className="settings-field-hint customer-requests-assisted-message-send-tip">
                      Ctrl + Enter to send
                    </span>
                  </div>
                </form>
              ) : canMutate ? (
                <p className="settings-field-hint" role="status">
                  {ASSISTED_CREATION_MESSAGING_CLOSED_MESSAGE}
                </p>
              ) : (
                <p className="settings-field-hint">
                  Helpers can view messages but not send replies.
                </p>
              )}
            </section>
          ) : null}
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
          isApprovedProof={item.approvedProofId === selectedProof.id}
          isLatest={proofMediaNewestFirst[0]?.id === selectedProof.id}
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { items, isLoading, error } = useAssistedCreationRequests();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<AssistedStageTab>("new");
  const [ackByRequestId, setAckByRequestId] = useState<Record<string, number>>({});
  const [detailTabFromRoute, setDetailTabFromRoute] = useState<AssistedDetailRouteTab>("overview");

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
      (message) => {
        console.error("[assistedCreationUpdateAcks] subscribe failed", message);
      },
    );
  }, [user?.id]);

  useEffect(() => {
    const requestId = searchParams.get(CUSTOMER_REQUEST_ID_QUERY_PARAM)?.trim() || null;
    const detailTabRaw = searchParams.get(CUSTOMER_REQUEST_DETAIL_TAB_QUERY_PARAM);
    const detailTab = isAssistedDetailRouteTab(detailTabRaw) ? detailTabRaw : "overview";

    if (!requestId) {
      return;
    }

    const match = items.find((item) => item.id === requestId);
    if (!match) {
      return;
    }

    setActiveStage(stageForStatus(match.status));
    setSelectedId(match.id);
    setDetailTabFromRoute(detailTab);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete(CUSTOMER_REQUEST_ID_QUERY_PARAM);
    nextParams.delete(CUSTOMER_REQUEST_DETAIL_TAB_QUERY_PARAM);
    setSearchParams(nextParams, { replace: true });
  }, [items, searchParams, setSearchParams]);

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

  async function markRequestHistoryEntryRead(
    item: AssistedCreationRequestListItem,
    entryAtMs: number,
  ): Promise<void> {
    if (!user?.id) {
      onToast("Sign in required to mark the message as read.");
      return;
    }
    const current = ackByRequestId[item.id] ?? null;
    if (current != null && current >= entryAtMs) {
      return;
    }
    try {
      await assistedCreationUpdateAckService.markReadThrough(
        user.id,
        item.id,
        entryAtMs,
        current,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to mark the message as read.";
      console.error("[assistedCreationUpdateAcks] markReadThrough failed", err);
      onToast(
        /permission|insufficient|Missing or insufficient/i.test(message)
          ? "Could not mark read — Firestore rules for update acks may need deploy on fresh-prints-dev."
          : `Could not mark read: ${message}`,
      );
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
          workflow.
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
                  return (
                    <button
                      aria-selected={isSelected}
                      className={`customer-requests-etsy-list-card${isSelected ? " is-selected" : ""}`}
                      key={item.id}
                      onClick={() => {
                        setSelectedId(item.id);
                        setDetailTabFromRoute("overview");
                      }}
                      role="option"
                      type="button"
                    >
                      <span className="customer-requests-etsy-list-card-title">
                        {item.customerDisplayName}
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
                    initialDetailTab={detailTabFromRoute}
                    item={selected}
                    onMarkHistoryEntryRead={(entryAtMs) => {
                      void markRequestHistoryEntryRead(selected, entryAtMs);
                    }}
                    onToast={onToast}
                    readThroughAtMs={ackByRequestId[selected.id] ?? null}
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
