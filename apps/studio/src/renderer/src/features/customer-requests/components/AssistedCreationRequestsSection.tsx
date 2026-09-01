import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download } from "lucide-react";

import {
  ASSISTED_CREATION_FIELD_LIMITS,
  ASSISTED_CREATION_MESSAGE_MAX_LENGTH,
  ASSISTED_CREATION_MESSAGING_CLOSED_MESSAGE,
  canSendAssistedCreationMessage,
  formatAssistedCreationStatus,
  type AssistedCreationStatus,
} from "@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants";
import { resolveArtworkBackgroundHex } from "@fresh-prints/shared/constants/design/artworkBackground.constants";
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
import {
  needsAssistedCatalogShareArtworkBackgroundLiveResolve,
  resolveAssistedCatalogShareArtworkBackgroundHex,
  snapshotAssistedCatalogArtworkBackgroundHex,
} from "@fresh-prints/shared/utils/assistedCreationCatalogShareArtworkBackground";
import {
  ASSISTED_CREATION_STAGE_TABS,
  stageForAssistedCreationStatus,
  type AssistedCreationStageTab,
} from "@fresh-prints/shared/utils/assistedCreationStageTab";
import { buildAssistedCreationAnswerDisplayRows } from "@fresh-prints/shared/utils/assistedCreationAnswerDisplay";
import { buildAssistedCreationReferenceImageLabel } from "@fresh-prints/shared/utils/assistedCreationAiContextProfile";
import {
  assistedCreationCatalogShareProofTitle,
  chronologicalAssistedCreationImageProofNumber,
  countAssistedCreationImageProofs,
  isAssistedCreationCatalogShareProof,
} from "@fresh-prints/shared/utils/assistedCreationProofKind";

import { useAuth } from "../../auth/hooks/useAuth";
import { Button } from "../../../shared/components/Button";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "../../../shared/components/Modal";
import { desktopAppService } from "../../../shared/services/desktopAppService";
import { DesignThumbnailPanel } from "../../designs/components/DesignThumbnailPanel";
import { getDesignLibraryPath } from "../../designs/constants/designLibraryFilters";
import { designDerivativeUrlService } from "../../designs/services/designDerivativeUrlService";
import { designService } from "../../designs/services/designService";
import { useAssistedCreationRequests } from "../hooks/useAssistedCreationRequests";
import {
  assistedCreationRequestsService,
  type AssistedCreationRequestListItem,
} from "../services/assistedCreationRequestsService";
import { assistedCreationUpdateAckService } from "../services/assistedCreationUpdateAckService";
import { AssistedCreationAiContextModal } from "./AssistedCreationAiContextModal";
import { AssistedStaffOverflowMenu } from "./AssistedStaffOverflowMenu";
import { AssistedCatalogDesignPickerModal } from "./AssistedCatalogDesignPickerModal";
import {
  CUSTOMER_REQUEST_DETAIL_TAB_QUERY_PARAM,
  CUSTOMER_REQUEST_ID_QUERY_PARAM,
  isAssistedDetailRouteTab,
  type AssistedDetailRouteTab,
} from "../constants/customerRequestRoutes";

function catalogShareCustomerStatusLabel(item: AssistedCreationRequestListItem): string {
  if (item.approvedCatalogDesignId) {
    return "Approved";
  }
  if (item.status === "revision_requested") {
    return "Changes requested";
  }
  if (item.status === "proof_ready") {
    return "Pending customer review";
  }
  return "Pending";
}

function resolveCatalogShareStaffSummary(item: AssistedCreationRequestListItem): {
  designId: string;
  previewPath: string;
  title: string;
  artworkBackgroundHex?: string;
} | null {
  const suggestion = item.suggestedCatalogDesign;
  const designId = suggestion?.designId?.trim() || item.approvedCatalogDesignId?.trim() || "";
  if (!designId) {
    return null;
  }

  const catalogProof = [...item.proofs]
    .reverse()
    .find(
      (proof) =>
        isAssistedCreationCatalogShareProof(proof) &&
        (proof.catalogDesignId?.trim() || "") === designId,
    );

  const title =
    suggestion?.title?.trim() || assistedCreationCatalogShareProofTitle(catalogProof);
  const previewPath =
    suggestion?.previewImageUrl?.trim() ||
    catalogProof?.catalogPreviewImageUrl?.trim() ||
    "";
  const artworkBackgroundHex = resolveAssistedCatalogShareArtworkBackgroundHex({
    suggestedArtworkBackgroundHex: suggestion?.artworkBackgroundHex,
    proofCatalogArtworkBackgroundHex: catalogProof?.catalogArtworkBackgroundHex,
  });

  return { designId, previewPath, title, artworkBackgroundHex };
}

function AssistedCatalogShareStaffCard({ item }: { item: AssistedCreationRequestListItem }) {
  const { user } = useAuth();
  const summary = resolveCatalogShareStaffSummary(item);
  const snapshotHex = resolveAssistedCatalogShareArtworkBackgroundHex({
    suggestedArtworkBackgroundHex: summary?.artworkBackgroundHex,
  });
  const designId = summary?.designId?.trim() || "";
  const [liveHex, setLiveHex] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (
      !needsAssistedCatalogShareArtworkBackgroundLiveResolve({
        suggestedArtworkBackgroundHex: snapshotHex,
      }) ||
      !designId ||
      !user
    ) {
      setLiveHex(undefined);
      return;
    }
    let cancelled = false;
    void designService
      .getDesignById(user, designId)
      .then((design) => {
        if (!cancelled) {
          setLiveHex(snapshotAssistedCatalogArtworkBackgroundHex(design.artworkBackgroundHex));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLiveHex(undefined);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [designId, snapshotHex, user]);

  if (!summary) {
    return null;
  }

  const statusLabel = catalogShareCustomerStatusLabel(item);
  const libraryPath = getDesignLibraryPath({ search: summary.designId });
  const artworkBackgroundHex = resolveAssistedCatalogShareArtworkBackgroundHex({
    suggestedArtworkBackgroundHex: snapshotHex,
    liveDesignArtworkBackgroundHex: liveHex,
  });

  return (
    <section className="customer-requests-assisted-panel customer-requests-assisted-catalog-share">
      <h3 className="customer-requests-assisted-panel-title">Design Library suggestion</h3>
      <p className="customer-requests-assisted-catalog-share-status">
        Customer status: <strong>{statusLabel}</strong>
      </p>
      <div className="customer-requests-assisted-catalog-share-row">
        <DesignThumbnailPanel
          alt={`${summary.title} preview`}
          artworkBackgroundHex={artworkBackgroundHex}
          catalogPath={summary.previewPath || undefined}
          className="customer-requests-assisted-catalog-share-thumb"
          fallbackLabel="Preview unavailable"
          imageFit="cover"
        />
        <div className="customer-requests-assisted-catalog-share-body">
          <p className="customer-requests-assisted-catalog-share-title">{summary.title}</p>
          <Link className="link-button" to={libraryPath}>
            Open in Design Library
          </Link>
        </div>
      </div>
    </section>
  );
}

type AssistedDetailTab = "overview" | "proofs" | "messages";

type AssistedStageTab = AssistedCreationStageTab;

const STAGE_TABS = ASSISTED_CREATION_STAGE_TABS;

function stageForStatus(status: AssistedCreationStatus): AssistedStageTab {
  return stageForAssistedCreationStatus(status);
}

interface AssistedMediaPreview {
  id: string;
  url: string;
  fileName: string;
  storagePath: string;
  /** True when Storage URL could not be resolved. */
  unavailable?: boolean;
  /** True while bytes/URL are still loading (placeholder thumb). */
  loading?: boolean;
}

interface AssistedProofPreview extends AssistedMediaPreview {
  number: number;
  note?: string;
  createdAt: unknown;
  createdBy: string;
  /** Staff proof note + linked history notes (excludes email system noise). */
  notes: string[];
  /** True when preview URL could not be resolved (purged or load failure). */
  unavailable: boolean;
  /** True when full-res Storage object is missing or purged (not a transient load failure). */
  purged?: boolean;
  /** Design Library recommendation row (not a custom proof PNG). */
  isCatalogShare: boolean;
  catalogDesignId?: string;
  catalogDesignTitle?: string;
  /** Catalog derivative path for `catalog_share` thumbs (never assisted proof Storage). */
  catalogPreviewImageUrl?: string;
  /** Snapshot artwork mat for catalog_share thumbs. */
  catalogArtworkBackgroundHex?: string;
}

function assistedMediaFingerprint(
  entries: ReadonlyArray<{ id?: string; storagePath?: string }>,
): string {
  return entries
    .map((entry) => `${String(entry.id ?? "").trim()}::${String(entry.storagePath ?? "").trim()}`)
    .join("|");
}

function revokeAssistedMediaBlobUrls(entries: ReadonlyArray<{ url: string }>): void {
  for (const entry of entries) {
    if (entry.url.startsWith("blob:")) {
      URL.revokeObjectURL(entry.url);
    }
  }
}

/**
 * Electron save dialog only accepts Firebase Storage https URLs — not blob: object URLs.
 * Preview may use blob: (authenticated getBytes); download always resolves via storagePath.
 */
async function downloadAssistedMediaFile(media: AssistedMediaPreview): Promise<"saved" | "canceled"> {
  const path = media.storagePath?.trim() || "";
  if (!path) {
    throw new Error("This file is not available for download.");
  }
  const downloadUrl =
    media.url.startsWith("blob:") || !media.url
      ? await assistedCreationRequestsService.getDownloadUrl(path)
      : media.url;
  return desktopAppService.downloadUrlToFile(downloadUrl, media.fileName);
}

async function loadAssistedReferencePreview(
  image: { id: string; storagePath: string; contentType?: string },
  fileName: string,
): Promise<AssistedMediaPreview> {
  const storagePath = image.storagePath?.trim() || "";
  if (!storagePath) {
    return {
      id: image.id,
      url: "",
      fileName,
      storagePath: "",
      unavailable: true,
      loading: false,
    };
  }

  // Prefer signed URL first (catalog thumbs use the same path successfully in Studio).
  // getBytes is Electron-safe for CORS-sensitive cases but can hang without a timeout —
  // service-level timeouts + this order keep thumbs from sticking on Loading forever.
  try {
    const url = await assistedCreationRequestsService.getDownloadUrl(storagePath);
    if (url) {
      return {
        id: image.id,
        url,
        fileName,
        storagePath,
        unavailable: false,
        loading: false,
      };
    }
  } catch {
    // Fall through to authenticated bytes.
  }

  try {
    const bytes = await assistedCreationRequestsService.downloadBytes(storagePath);
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const blob = new Blob([copy], {
      type: image.contentType?.trim() || "application/octet-stream",
    });
    return {
      id: image.id,
      url: URL.createObjectURL(blob),
      fileName,
      storagePath,
      unavailable: false,
      loading: false,
    };
  } catch {
    return {
      id: image.id,
      url: "",
      fileName,
      storagePath,
      unavailable: true,
      loading: false,
    };
  }
}

/** Same signed-URL-first strategy as references — proofs must not hang on getBytes. */
async function loadAssistedProofImagePreview(
  proof: { id: string; storagePath: string; contentType?: string },
  fileName: string,
): Promise<Pick<AssistedMediaPreview, "url" | "unavailable" | "loading">> {
  const preview = await loadAssistedReferencePreview(proof, fileName);
  return {
    url: preview.url,
    unavailable: preview.unavailable === true,
    loading: false,
  };
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
    case "final_source_needed":
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
  const unavailable = !media.loading && (media.unavailable || !media.url);
  return (
    <div className="customer-requests-assisted-thumb">
      {media.loading ? (
        <div className="customer-requests-assisted-thumb-unavailable" title={media.fileName}>
          <span>Loading…</span>
          <span className="settings-field-hint">{media.fileName || "Reference"}</span>
        </div>
      ) : unavailable ? (
        <div className="customer-requests-assisted-thumb-unavailable" title={media.fileName}>
          <span>Preview unavailable</span>
          <span className="settings-field-hint">{media.fileName || "Reference"}</span>
        </div>
      ) : (
        <a href={media.url} rel="noreferrer" target="_blank" title="Open full size">
          <img alt={media.fileName || "Reference"} src={media.url} />
        </a>
      )}
      <button
        aria-label={`Download ${media.fileName || "reference image"}`}
        className="customer-requests-assisted-thumb-download"
        disabled={downloading || unavailable || Boolean(media.loading)}
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
  const title = proof.isCatalogShare
    ? assistedCreationCatalogShareProofTitle({
        catalogDesignTitle: proof.catalogDesignTitle,
        fileName: proof.fileName,
      })
    : `Proof ${proof.number}${isLatest ? " (latest)" : ""}`;
  const libraryPath =
    proof.isCatalogShare && proof.catalogDesignId
      ? getDesignLibraryPath({ search: proof.catalogDesignId })
      : null;
  const catalogPreviewPath = proof.catalogPreviewImageUrl?.trim() || "";

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
              {proof.isCatalogShare ? (
                <>
                  Design Library
                  {isLatest ? " (latest)" : ""}
                </>
              ) : (
                title
              )}
            </h2>
          </ModalHeader>
          <ModalBody className="customer-requests-assisted-proof-modal-body">
            {proof.isCatalogShare ? (
              catalogPreviewPath || proof.url ? (
                <div
                  className="customer-requests-assisted-proof-modal-image"
                  style={
                    proof.catalogArtworkBackgroundHex
                      ? {
                          ["--color-artwork-preview-bg" as string]:
                            resolveArtworkBackgroundHex(proof.catalogArtworkBackgroundHex),
                        }
                      : undefined
                  }
                >
                  {proof.url ? (
                    <img alt={title} src={proof.url} />
                  ) : (
                    <DesignThumbnailPanel
                      alt={title}
                      artworkBackgroundHex={proof.catalogArtworkBackgroundHex}
                      catalogPath={catalogPreviewPath}
                      className="customer-requests-assisted-proof-modal-catalog-thumb"
                      fallbackLabel="Preview unavailable"
                      imageFit="contain"
                    />
                  )}
                </div>
              ) : (
                <p className="settings-field-hint">
                  Preview is unavailable for this library design.
                </p>
              )
            ) : proof.loading ? (
              <p className="settings-field-hint">Loading proof…</p>
            ) : proof.unavailable || !proof.url ? (
              <p className="settings-field-hint">
                {proof.purged
                  ? "Full-resolution file is no longer available."
                  : "Preview unavailable."}
              </p>
            ) : (
              <div className="customer-requests-assisted-proof-modal-image">
                <img alt={title} src={proof.url} />
              </div>
            )}
            <dl className="customer-requests-etsy-detail-summary">
              {proof.isCatalogShare ? (
                <>
                  <AnswerRow label="Type" value="Design Library suggestion" />
                  <AnswerRow label="Design" value={title} />
                  {isApprovedProof ? <AnswerRow label="Customer status" value="Approved" /> : null}
                </>
              ) : (
                <>
                  {isApprovedProof ? <AnswerRow label="Status" value="Approved proof" /> : null}
                  <AnswerRow label="File" value={proof.fileName} />
                </>
              )}
              <AnswerRow label="Submitted" value={formatHistoryAt(proof.createdAt)} />
              <AnswerRow
                label="Submitted by"
                value={proof.createdBy ? `Staff · ${proof.createdBy}` : "Staff"}
              />
            </dl>
            <div className="customer-requests-assisted-proof-modal-actions">
              {libraryPath ? (
                <Link className="link-button" to={libraryPath}>
                  Open in Design Library
                </Link>
              ) : null}
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
            {proof.isCatalogShare ? null : (
              <Button
                disabled={downloading || proof.unavailable || !proof.url}
                onClick={() => onDownload(proof)}
                variant="secondary"
              >
                Download
              </Button>
            )}
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
          title={
            proof.isCatalogShare
              ? `Design Library · Notes`
              : `Proof ${proof.number} · Notes`
          }
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
  onFollowRequest,
  onMarkHistoryEntryRead,
  onToast,
  readThroughAtMs,
  unreadUpdateCount,
}: {
  canMutate: boolean;
  canRestore: boolean;
  initialDetailTab?: AssistedDetailTab;
  item: AssistedCreationRequestListItem;
  onFollowRequest: (requestId: string, status: AssistedCreationStatus) => void;
  onMarkHistoryEntryRead: (entryAtMs: number) => void;
  onToast: (message: string) => void;
  readThroughAtMs: number | null;
  unreadUpdateCount: number;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofNote, setProofNote] = useState("");
  const [staffNotes, setStaffNotes] = useState(item.staffNotes);
  const [aiContextOpen, setAiContextOpen] = useState(false);
  const [pendingFinalFile, setPendingFinalFile] = useState<File | null>(null);
  const [pendingFinalPreviewUrl, setPendingFinalPreviewUrl] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [refMedia, setRefMedia] = useState<AssistedMediaPreview[]>([]);
  const [proofMedia, setProofMedia] = useState<AssistedProofPreview[]>([]);
  const [finalSourcePreview, setFinalSourcePreview] = useState<AssistedMediaPreview | null>(null);
  const [selectedProofId, setSelectedProofId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pendingProofFile, setPendingProofFile] = useState<File | null>(null);
  const [pendingProofPreviewUrl, setPendingProofPreviewUrl] = useState<string | null>(null);
  const [catalogPickerOpen, setCatalogPickerOpen] = useState(false);
  const [reasonModal, setReasonModal] = useState<"reject" | "cancel" | "restore" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [activeDetailTab, setActiveDetailTab] = useState<AssistedDetailTab>("overview");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesPanelRef = useRef<HTMLElement>(null);
  const messagesThreadRef = useRef<HTMLDivElement>(null);
  const refMediaBlobRef = useRef<AssistedMediaPreview[]>([]);
  const proofMediaBlobRef = useRef<AssistedProofPreview[]>([]);
  const answers = item.answers;

  refMediaBlobRef.current = refMedia;
  proofMediaBlobRef.current = proofMedia;

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
      if (pendingFinalPreviewUrl) {
        URL.revokeObjectURL(pendingFinalPreviewUrl);
      }
    };
  }, [pendingFinalPreviewUrl, pendingProofPreviewUrl]);

  const refFingerprint = useMemo(
    () => assistedMediaFingerprint(item.referenceImages),
    [item.referenceImages],
  );
  const proofFingerprint = useMemo(
    () => assistedMediaFingerprint(item.proofs),
    [item.proofs],
  );
  const historyFingerprint = useMemo(() => {
    const history = item.revisionHistory;
    if (!Array.isArray(history) || history.length === 0) {
      return "0";
    }
    const last = history[history.length - 1];
    return `${history.length}:${assistedCreationRevisionAtMillis(last?.at)}`;
  }, [item.revisionHistory]);

  useEffect(() => {
    let cancelled = false;
    const images = item.referenceImages;
    /** Absolute safety: never leave Loading placeholders if a download hangs past service timeout. */
    const safetyTimer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      setRefMedia((previous) => {
        let changed = false;
        const next = previous.map((entry) => {
          if (!entry.loading) {
            return entry;
          }
          changed = true;
          return {
            ...entry,
            url: "",
            loading: false,
            unavailable: true,
          } satisfies AssistedMediaPreview;
        });
        return changed ? next : previous;
      });
    }, 28_000);

    if (images.length === 0) {
      setRefMedia((previous) => {
        revokeAssistedMediaBlobUrls(previous);
        return [];
      });
      return () => {
        cancelled = true;
        window.clearTimeout(safetyTimer);
      };
    }

    // Seed placeholders immediately so we never flash "No reference images" while loading.
    setRefMedia((previous) => {
      const previousById = new Map(previous.map((entry) => [entry.id, entry]));
      const next = images.map((image, index) => {
        const fileName = buildAssistedCreationReferenceImageLabel(index);
        const prior = previousById.get(image.id);
        if (
          prior &&
          prior.storagePath === image.storagePath &&
          prior.url &&
          !prior.unavailable &&
          !prior.loading
        ) {
          return { ...prior, fileName };
        }
        return {
          id: image.id,
          url: "",
          fileName,
          storagePath: image.storagePath,
          loading: true,
          unavailable: false,
        } satisfies AssistedMediaPreview;
      });
      for (const entry of previous) {
        if (!images.some((image) => image.id === entry.id) && entry.url.startsWith("blob:")) {
          URL.revokeObjectURL(entry.url);
        }
      }
      return next;
    });

    // Settle each thumb independently so one hung download cannot block the rest.
    for (let index = 0; index < images.length; index += 1) {
      const image = images[index];
      if (!image) {
        continue;
      }
      const fileName = buildAssistedCreationReferenceImageLabel(index);
      void (async () => {
        const preview = await loadAssistedReferencePreview(image, fileName);
        if (cancelled) {
          revokeAssistedMediaBlobUrls([preview]);
          return;
        }
        setRefMedia((previous) => {
          const prior = previous.find((entry) => entry.id === preview.id);
          if (
            prior &&
            prior.storagePath === preview.storagePath &&
            prior.url &&
            !prior.unavailable &&
            !prior.loading &&
            prior.url === preview.url
          ) {
            revokeAssistedMediaBlobUrls([preview]);
            return previous;
          }
          return previous.map((entry) => {
            if (entry.id !== preview.id) {
              return entry;
            }
            if (entry.url.startsWith("blob:") && entry.url !== preview.url) {
              URL.revokeObjectURL(entry.url);
            }
            return { ...preview, loading: false };
          });
        });
      })();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(safetyTimer);
    };
    // Fingerprint avoids cancel thrash from new array identities on every snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional stable dep
  }, [item.id, refFingerprint]);

  useEffect(() => {
    let cancelled = false;
    const PROOF_LOAD_SAFETY_MS = 28_000;
    const safetyTimer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      setProofMedia((previous) =>
        previous.map((entry) => {
          if (!entry.loading) {
            return entry;
          }
          return {
            ...entry,
            url: "",
            loading: false,
            unavailable: true,
            purged: entry.purged === true,
          };
        }),
      );
    }, PROOF_LOAD_SAFETY_MS);

    function buildProofBase(proof: (typeof item.proofs)[number]): Omit<
      AssistedProofPreview,
      "url" | "unavailable" | "loading" | "purged"
    > {
      const isCatalogShare = isAssistedCreationCatalogShareProof(proof);
      const catalogTitle = assistedCreationCatalogShareProofTitle(proof);
      const catalogPreviewPath = proof.catalogPreviewImageUrl?.trim() || "";
      const imageNumber = chronologicalAssistedCreationImageProofNumber(item.proofs, proof.id);
      return {
        id: proof.id,
        fileName: isCatalogShare ? catalogTitle : proof.fileName || `proof-${proof.id}`,
        storagePath: isCatalogShare ? "" : proof.storagePath,
        number: imageNumber,
        ...(proof.note ? { note: proof.note } : {}),
        createdAt: proof.createdAt,
        createdBy: proof.createdBy,
        notes: notesForProof(proof, item.proofs, item.revisionHistory),
        isCatalogShare,
        ...(isCatalogShare
          ? (() => {
              const catalogArtworkBackgroundHex = resolveAssistedCatalogShareArtworkBackgroundHex({
                suggestedArtworkBackgroundHex: item.suggestedCatalogDesign?.artworkBackgroundHex,
                proofCatalogArtworkBackgroundHex: proof.catalogArtworkBackgroundHex,
              });
              return {
                catalogDesignId: proof.catalogDesignId?.trim() || "",
                catalogDesignTitle: catalogTitle,
                catalogPreviewImageUrl: catalogPreviewPath,
                ...(catalogArtworkBackgroundHex
                  ? { catalogArtworkBackgroundHex }
                  : {}),
              };
            })()
          : {}),
      };
    }

    // Seed placeholders immediately so Proofs tab updates on snapshot (do not wait for getBytes).
    setProofMedia((previous) => {
      const next = item.proofs.map((proof) => {
        const base = buildProofBase(proof);
        const isCatalogShare = base.isCatalogShare;
        const catalogPreviewPath = base.catalogPreviewImageUrl?.trim() || "";
        const purged =
          !isCatalogShare &&
          (proof.fullSizePurgedAt != null || !String(proof.storagePath ?? "").trim());
        const prior = previous.find(
          (entry) => entry.id === proof.id && entry.storagePath === base.storagePath,
        );
        if (prior && !prior.loading && (prior.url || prior.unavailable)) {
          return {
            ...base,
            url: prior.url,
            unavailable: prior.unavailable,
            loading: false,
            purged: prior.purged === true || purged,
            fileName: isCatalogShare ? base.fileName : `Proof ${base.number}`,
          } satisfies AssistedProofPreview;
        }
        return {
          ...base,
          url: "",
          unavailable: purged || (isCatalogShare && !catalogPreviewPath),
          loading: !(purged || (isCatalogShare && !catalogPreviewPath)),
          purged,
          fileName: isCatalogShare ? base.fileName : `Proof ${base.number}`,
        } satisfies AssistedProofPreview;
      });
      for (const entry of previous) {
        if (!item.proofs.some((proof) => proof.id === entry.id) && entry.url.startsWith("blob:")) {
          URL.revokeObjectURL(entry.url);
        }
      }
      return next;
    });

    for (const proof of item.proofs) {
      void (async () => {
        const base = buildProofBase(proof);
        const isCatalogShare = base.isCatalogShare;
        const catalogPreviewPath = base.catalogPreviewImageUrl?.trim() || "";
        const displayName = isCatalogShare ? base.fileName : `Proof ${base.number}`;

        let settled: AssistedProofPreview;

        if (isCatalogShare) {
          let catalogArtworkBackgroundHex = base.catalogArtworkBackgroundHex;
          if (
            !catalogArtworkBackgroundHex &&
            user &&
            base.catalogDesignId &&
            needsAssistedCatalogShareArtworkBackgroundLiveResolve({
              suggestedArtworkBackgroundHex: item.suggestedCatalogDesign?.artworkBackgroundHex,
              proofCatalogArtworkBackgroundHex: proof.catalogArtworkBackgroundHex,
            })
          ) {
            try {
              const design = await designService.getDesignById(user, base.catalogDesignId);
              catalogArtworkBackgroundHex = resolveAssistedCatalogShareArtworkBackgroundHex({
                suggestedArtworkBackgroundHex: item.suggestedCatalogDesign?.artworkBackgroundHex,
                proofCatalogArtworkBackgroundHex: proof.catalogArtworkBackgroundHex,
                liveDesignArtworkBackgroundHex: design.artworkBackgroundHex,
              });
            } catch {
              catalogArtworkBackgroundHex = undefined;
            }
          }
          const withBg = {
            ...base,
            ...(catalogArtworkBackgroundHex ? { catalogArtworkBackgroundHex } : {}),
          };
          if (!catalogPreviewPath) {
            settled = {
              ...withBg,
              fileName: displayName,
              url: "",
              unavailable: true,
              loading: false,
              purged: false,
            };
          } else {
            try {
              const url =
                (await designDerivativeUrlService.getDownloadUrlForCatalogPath(
                  catalogPreviewPath,
                )) ?? "";
              settled = {
                ...withBg,
                fileName: displayName,
                url,
                unavailable: !url,
                loading: false,
                purged: false,
              };
            } catch {
              settled = {
                ...withBg,
                fileName: displayName,
                url: "",
                // List/modal can still render via DesignThumbnailPanel + catalog path.
                unavailable: false,
                loading: false,
                purged: false,
              };
            }
          }
        } else if (proof.fullSizePurgedAt != null || !proof.storagePath?.trim()) {
          settled = {
            ...base,
            fileName: displayName,
            url: "",
            unavailable: true,
            loading: false,
            purged: true,
          };
        } else {
          const preview = await loadAssistedProofImagePreview(
            {
              id: proof.id,
              storagePath: proof.storagePath,
              contentType: proof.contentType,
            },
            displayName,
          );
          settled = {
            ...base,
            fileName: displayName,
            url: preview.url,
            unavailable: preview.unavailable === true,
            loading: false,
            purged: false,
          };
        }

        if (cancelled) {
          revokeAssistedMediaBlobUrls([settled]);
          return;
        }
        setProofMedia((previous) => {
          const prior = previous.find((entry) => entry.id === settled.id);
          if (
            prior &&
            prior.storagePath === settled.storagePath &&
            prior.url &&
            !prior.unavailable &&
            !prior.loading &&
            prior.url === settled.url
          ) {
            revokeAssistedMediaBlobUrls([settled]);
            return previous;
          }
          return previous.map((entry) => {
            if (entry.id !== settled.id) {
              return entry;
            }
            if (entry.url.startsWith("blob:") && entry.url !== settled.url) {
              URL.revokeObjectURL(entry.url);
            }
            return settled;
          });
        });
      })();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(safetyTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional stable deps
  }, [item.id, proofFingerprint, historyFingerprint, user?.id]);

  useEffect(() => {
    let cancelled = false;
    const finalSource = item.finalSource;
    if (!finalSource?.storagePath?.trim()) {
      setFinalSourcePreview(null);
      return;
    }
    void loadAssistedReferencePreview(
      {
        id: finalSource.id,
        storagePath: finalSource.storagePath,
        contentType: finalSource.contentType,
      },
      finalSource.fileName || "Final Artwork",
    ).then((preview) => {
      if (!cancelled) {
        setFinalSourcePreview(preview);
      } else {
        revokeAssistedMediaBlobUrls([preview]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [item.finalSource]);

  useEffect(() => {
    return () => {
      revokeAssistedMediaBlobUrls(refMediaBlobRef.current);
      revokeAssistedMediaBlobUrls(proofMediaBlobRef.current);
    };
  }, []);

  async function handleDownload(media: AssistedMediaPreview): Promise<void> {
    setDownloadingId(media.id);
    setError(null);
    try {
      const outcome = await downloadAssistedMediaFile(media);
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
    const downloadable = refMedia.filter(
      (media) => media.url && !media.unavailable && !media.loading,
    );
    if (downloadable.length === 0) {
      return;
    }
    setDownloadingId("all-refs");
    setError(null);
    try {
      let savedCount = 0;
      for (const media of downloadable) {
        const outcome = await downloadAssistedMediaFile(media);
        if (outcome === "saved") {
          savedCount += 1;
        }
      }
      if (savedCount > 0) {
        onToast(
          savedCount === 1
            ? `Saved ${downloadable[0]?.fileName ?? "reference"}`
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
      if (action === "start_work" || action === "resume_work") {
        onFollowRequest(item.id, "in_progress");
      } else if (action === "restore") {
        onFollowRequest(item.id, "submitted");
      } else if (action === "reject" || action === "cancel") {
        onFollowRequest(item.id, statusLabel);
      }
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
        proofNumber: countAssistedCreationImageProofs(item.proofs) + 1,
        note: proofNote.trim() || undefined,
      });
      clearPendingProof();
      onToast("Proof submitted to customer");
      onFollowRequest(item.id, "proof_ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit proof.");
    } finally {
      setBusy(false);
    }
  }

  function clearPendingFinalSource(): void {
    if (pendingFinalPreviewUrl) {
      URL.revokeObjectURL(pendingFinalPreviewUrl);
    }
    setPendingFinalFile(null);
    setPendingFinalPreviewUrl(null);
  }

  async function submitPendingFinalSource(): Promise<void> {
    if (!pendingFinalFile || !canMutate || item.status !== "final_source_needed") {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await assistedCreationRequestsService.uploadAndAttachFinalSource({
        requestId: item.id,
        customerUid: item.customerUid,
        file: pendingFinalFile,
      });
      clearPendingFinalSource();
      onToast("Final artwork uploaded — request completed");
      onFollowRequest(item.id, "approved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload final artwork.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCatalogSuggestion(designId: string): Promise<void> {
    if (!canMutate) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await assistedCreationRequestsService.suggestCatalogDesign({
        requestId: item.id,
        designId,
      });
      setCatalogPickerOpen(false);
      onToast("Library design sent to customer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to share library design.");
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
  /** Reject only for New / submitted — after Start Work, staff may cancel instead. */
  const canReject = canMutate && item.status === "submitted";
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
  const hasArtworkHistory =
    proofMediaNewestFirst.length > 0 || Boolean(item.finalSource?.storagePath?.trim());
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
            <div className="customer-requests-assisted-panel-header">
              <h3 className="customer-requests-assisted-panel-title">Brief</h3>
              <Button
                aria-label="AI Context"
                disabled={busy}
                onClick={() => setAiContextOpen(true)}
                size="sm"
                type="button"
                variant="secondary"
              >
                AI Context…
              </Button>
            </div>
            <p className="customer-requests-assisted-brief">{description}</p>
          </section>

          <section className="customer-requests-assisted-panel">
            <h3 className="customer-requests-assisted-panel-title">Request details</h3>
            <dl className="customer-requests-etsy-detail-summary">
              {buildAssistedCreationAnswerDisplayRows(answers).map((row) => (
                <AnswerRow key={row.label} label={row.label} value={row.value} />
              ))}
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
              {item.suggestedCatalogDesign || item.approvedCatalogDesignId ? (
                <AssistedCatalogShareStaffCard item={item} />
              ) : null}
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
            <h3 className="customer-requests-assisted-panel-title">Proofs &amp; artwork</h3>
            {hasArtworkHistory ? (
              <ul className="customer-requests-assisted-proof-list">
                {item.finalSource?.storagePath ? (
                  <li key={`final-${item.finalSource.id}`}>
                    <div className="customer-requests-assisted-proof-row customer-requests-assisted-proof-row--static">
                      {finalSourcePreview?.url && !finalSourcePreview.unavailable ? (
                        <img alt="" src={finalSourcePreview.url} />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="customer-requests-assisted-proof-row-placeholder"
                        />
                      )}
                      <span className="customer-requests-assisted-proof-row-body">
                        <span className="customer-requests-assisted-proof-row-title">
                          Final Artwork
                        </span>
                        <span className="customer-requests-assisted-proof-row-meta">
                          {item.finalSource.fileName || "Uploaded final artwork"}
                        </span>
                      </span>
                    </div>
                  </li>
                ) : null}
                {proofMediaNewestFirst.map((proof, index) => {
                  const isLatest = !item.finalSource?.storagePath && index === 0;
                  const isApprovedProof =
                    !proof.isCatalogShare && item.approvedProofId === proof.id;
                  const isApprovedCatalog =
                    proof.isCatalogShare &&
                    Boolean(item.approvedCatalogDesignId) &&
                    proof.catalogDesignId === item.approvedCatalogDesignId;
                  const metaBits: string[] = [];
                  if (proof.isCatalogShare) {
                    metaBits.push("Design Library");
                  }
                  if (isApprovedProof || isApprovedCatalog) {
                    metaBits.push("Approved");
                  }
                  if (proof.unavailable) {
                    metaBits.push(
                      proof.isCatalogShare || !proof.purged
                        ? "Preview unavailable"
                        : "File removed",
                    );
                  }
                  if (proof.notes.length > 0) {
                    metaBits.push("Notes");
                  }
                  const rowTitle = proof.isCatalogShare
                    ? assistedCreationCatalogShareProofTitle({
                        catalogDesignTitle: proof.catalogDesignTitle,
                        fileName: proof.fileName,
                      })
                    : `Proof ${proof.number}${isLatest ? " (latest)" : ""}`;
                  const catalogPreviewPath = proof.catalogPreviewImageUrl?.trim() || "";
                  return (
                    <li key={proof.id}>
                      <button
                        className="customer-requests-assisted-proof-row"
                        onClick={() => setSelectedProofId(proof.id)}
                        type="button"
                      >
                        {proof.isCatalogShare ? (
                          catalogPreviewPath ? (
                            <DesignThumbnailPanel
                              alt=""
                              artworkBackgroundHex={proof.catalogArtworkBackgroundHex}
                              catalogPath={catalogPreviewPath}
                              className="customer-requests-assisted-proof-row-catalog-thumb"
                              decorative
                              fallbackLabel="Preview unavailable"
                              imageFit="cover"
                            />
                          ) : proof.url ? (
                            <img
                              alt=""
                              src={proof.url}
                              style={
                                proof.catalogArtworkBackgroundHex
                                  ? {
                                      ["--color-artwork-preview-bg" as string]:
                                        resolveArtworkBackgroundHex(
                                          proof.catalogArtworkBackgroundHex,
                                        ),
                                    }
                                  : undefined
                              }
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="customer-requests-assisted-proof-row-placeholder"
                            />
                          )
                        ) : proof.loading ? (
                          <span
                            aria-label="Loading proof"
                            className="customer-requests-assisted-proof-row-placeholder is-loading"
                            role="status"
                          />
                        ) : proof.unavailable || !proof.url ? (
                          <span
                            aria-hidden="true"
                            className="customer-requests-assisted-proof-row-placeholder"
                          />
                        ) : (
                          <img alt="" src={proof.url} />
                        )}
                        <span className="customer-requests-assisted-proof-row-body">
                          <span className="customer-requests-assisted-proof-row-title">
                            {proof.isCatalogShare ? (
                              <>
                                Design Library
                                {isLatest ? " (latest)" : ""}
                                <span className="settings-field-hint"> · {rowTitle}</span>
                              </>
                            ) : (
                              rowTitle
                            )}
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
              <p className="settings-field-hint">No proofs yet.</p>
            )}

            {canMutate && item.status === "final_source_needed" ? (
              <div className="customer-requests-assisted-proof-upload">
                <p className="settings-field-hint">
                  Customer approved the proof. Upload the final high-resolution artwork to complete
                  this request.
                </p>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="visually-hidden"
                  id={`assisted-final-source-${item.id}`}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) {
                      return;
                    }
                    if (pendingFinalPreviewUrl) {
                      URL.revokeObjectURL(pendingFinalPreviewUrl);
                    }
                    setPendingFinalFile(file);
                    setPendingFinalPreviewUrl(URL.createObjectURL(file));
                    setError(null);
                  }}
                  type="file"
                />
                {!pendingFinalFile ? (
                  <Button
                    disabled={busy}
                    onClick={() =>
                      document.getElementById(`assisted-final-source-${item.id}`)?.click()
                    }
                  >
                    Upload Final Artwork
                  </Button>
                ) : (
                  <div className="customer-requests-assisted-proof-pending">
                    {pendingFinalPreviewUrl ? (
                      <div className="customer-requests-assisted-proof-pending-preview">
                        <img alt="Pending final artwork preview" src={pendingFinalPreviewUrl} />
                      </div>
                    ) : null}
                    <p className="customer-requests-assisted-proof-pending-name">
                      {pendingFinalFile.name}
                    </p>
                    <div className="customer-requests-assisted-action-row">
                      <Button
                        disabled={busy}
                        onClick={() => void submitPendingFinalSource()}
                        type="button"
                      >
                        {busy ? "Uploading…" : "Submit final artwork"}
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={clearPendingFinalSource}
                        type="button"
                        variant="secondary"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {canMutate && item.status === "in_progress" ? (
              <div className="customer-requests-assisted-proof-upload">
                <div className="customer-requests-assisted-action-row">
                  <Button
                    disabled={busy}
                    onClick={() => setCatalogPickerOpen(true)}
                    variant="secondary"
                  >
                    Share library design…
                  </Button>
                </div>
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
          isApprovedProof={
            selectedProof.isCatalogShare
              ? Boolean(item.approvedCatalogDesignId) &&
                selectedProof.catalogDesignId === item.approvedCatalogDesignId
              : item.approvedProofId === selectedProof.id
          }
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

      {catalogPickerOpen ? (
        <AssistedCatalogDesignPickerModal
          busy={busy}
          onCancel={() => {
            if (!busy) {
              setCatalogPickerOpen(false);
            }
          }}
          onConfirm={(design) => {
            void submitCatalogSuggestion(design.id);
          }}
        />
      ) : null}

      {aiContextOpen ? (
        <AssistedCreationAiContextModal
          answers={item.answers}
          fulfillmentMode={item.fulfillmentMode}
          onClose={() => setAiContextOpen(false)}
          onToast={onToast}
          referenceImages={item.referenceImages}
          requestId={item.id}
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
  /**
   * After Start Work / status actions, the destination tab is selected before the Firestore
   * snapshot moves the request. Hold the target so we do not clear selection (and unmount the
   * detail panel mid reference-image load → stuck "Loading…").
   */
  const [followHold, setFollowHold] = useState<{
    id: string;
    stage: AssistedStageTab;
  } | null>(null);
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
      final_source_needed: 0,
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

  useEffect(() => {
    if (!followHold) {
      return;
    }
    const match = items.find((item) => item.id === followHold.id);
    if (match && stageForStatus(match.status) === followHold.stage) {
      setFollowHold(null);
      setSelectedId(followHold.id);
      setActiveStage(followHold.stage);
    }
  }, [followHold, items]);

  const selected = useMemo(() => {
    if (selectedId) {
      const inVisible = visibleItems.find((item) => item.id === selectedId);
      if (inVisible) {
        return inVisible;
      }
      // Keep the same detail panel mounted while waiting for the status snapshot.
      if (followHold?.id === selectedId) {
        return items.find((item) => item.id === selectedId) ?? null;
      }
    }
    return visibleItems[0] ?? null;
  }, [followHold, items, selectedId, visibleItems]);

  useEffect(() => {
    if (followHold) {
      return;
    }
    if (visibleItems.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !visibleItems.some((item) => item.id === selectedId)) {
      setSelectedId(visibleItems[0]?.id ?? null);
    }
  }, [followHold, selectedId, visibleItems]);

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
                    onFollowRequest={(requestId, status) => {
                      const stage = stageForStatus(status);
                      setFollowHold({ id: requestId, stage });
                      setActiveStage(stage);
                      setSelectedId(requestId);
                    }}
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
