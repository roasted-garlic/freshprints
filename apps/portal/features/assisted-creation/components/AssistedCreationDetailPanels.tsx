'use client';

import { useRouter } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import {
  ASSISTED_CREATION_MESSAGE_MAX_LENGTH,
  ASSISTED_CREATION_MESSAGING_CLOSED_MESSAGE,
  canSendAssistedCreationMessage,
} from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';
import { resolveArtworkBackgroundHex } from '@fresh-prints/shared/constants/design/artworkBackground.constants';
import type {
  AssistedCreationProof,
  AssistedCreationRequest,
} from '@fresh-prints/shared/types/assistedCreation/assistedCreation.types';
import {
  needsAssistedCatalogShareArtworkBackgroundLiveResolve,
  resolveAssistedCatalogShareArtworkBackgroundHex,
  snapshotAssistedCatalogArtworkBackgroundHex,
} from '@fresh-prints/shared/utils/assistedCreationCatalogShareArtworkBackground';
import {
  evaluateAssistedCreationApprovedProofDownload,
  isAssistedCreationProofPng,
  resolveAssistedCreationApprovedProofId,
} from '@fresh-prints/shared/utils/assistedCreationApprovedProofRetention';
import { evaluateAssistedApprovedProofAddToRequest } from '@fresh-prints/shared/utils/assistedCreationApprovedProofAddToRequest';
import {
  assistedCreationCatalogShareProofTitle,
  chronologicalAssistedCreationImageProofNumber,
  isAssistedCreationCatalogShareProof,
} from '@fresh-prints/shared/utils/assistedCreationProofKind';
import { buildAssistedCreationAnswerDisplayRows } from '@fresh-prints/shared/utils/assistedCreationAnswerDisplay';
import {
  assistedCreationTimestampMillis,
  buildAssistedHistoryEntries,
  formatAssistedWhen,
  notesForProof,
} from '../utils/assistedCreationDisplay';
import { assistedCreationService } from '../services/assistedCreationService';
import { catalogService } from '../../catalog/services/catalogService';
import { catalogStorageService } from '../../catalog/services/catalogStorageService';
import { buildPortalDesignDeepLinkPath } from '../../catalog/utils/portalDesignShareUrls';
import { portalPrintRequestService } from '../../print-requests/services/portalPrintRequestService';
import { usePortalPrintRequests } from '../../print-requests/context/PortalPrintRequestContext';
import { getPortalAuth } from '../../../lib/firebase/client';
import { AssistedCreationMediaThumbs } from './AssistedCreationMediaThumbs';
import {
  AssistedAddToRequestProgressModal,
  type AssistedAddToRequestProgressPhase,
} from './AssistedAddToRequestProgressModal';
import { AssistedLibraryListingConsentModal } from './AssistedLibraryListingConsentModal';

function catalogShareArtworkPreviewStyle(hex?: string | null): CSSProperties | undefined {
  const resolved = resolveAssistedCatalogShareArtworkBackgroundHex({
    suggestedArtworkBackgroundHex: hex,
  });
  if (!resolved) {
    return undefined;
  }
  return {
    ['--color-artwork-preview-bg' as string]: resolveArtworkBackgroundHex(resolved),
  };
}

function proofCreatedAtMillis(value: unknown): number {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().getTime();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.getTime();
    }
  }
  return 0;
}

/** Chronological proof number among image proofs only (1 = oldest). */
function chronologicalProofNumber(
  proofsAsc: AssistedCreationProof[],
  proofId: string,
): number {
  return chronologicalAssistedCreationImageProofNumber(proofsAsc, proofId);
}

/** Compact approved catalog design + Add to Request (catalog attach path). */
function AssistedApprovedCatalogDesignCard({ request }: { request: AssistedCreationRequest }) {
  const router = useRouter();
  const designId = request.approvedCatalogDesignId?.trim() || '';
  const {
    ensureWorkingPrintRequestId,
    openCurrentRequestDrawer,
    reloadWorkingItems,
    refreshRequests,
    workingItems,
    workingRequestLimit,
  } = usePortalPrintRequests();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [addProgressOpen, setAddProgressOpen] = useState(false);
  const [addProgressPhase, setAddProgressPhase] =
    useState<AssistedAddToRequestProgressPhase>('preparing');
  const [addProgressError, setAddProgressError] = useState<string | null>(null);

  const title =
    request.suggestedCatalogDesign?.title?.trim() || 'Approved library design';
  const previewPath = request.suggestedCatalogDesign?.previewImageUrl?.trim() || '';
  const snapshotArtworkBackgroundHex = resolveAssistedCatalogShareArtworkBackgroundHex({
    suggestedArtworkBackgroundHex: request.suggestedCatalogDesign?.artworkBackgroundHex,
  });
  const [liveArtworkBackgroundHex, setLiveArtworkBackgroundHex] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    if (
      !needsAssistedCatalogShareArtworkBackgroundLiveResolve({
        suggestedArtworkBackgroundHex: snapshotArtworkBackgroundHex,
      }) ||
      !designId
    ) {
      setLiveArtworkBackgroundHex(undefined);
      return;
    }
    let cancelled = false;
    void catalogService
      .getReadyDesignsByIds([designId])
      .then((designs) => {
        if (!cancelled) {
          setLiveArtworkBackgroundHex(
            snapshotAssistedCatalogArtworkBackgroundHex(designs[0]?.artworkBackgroundHex),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLiveArtworkBackgroundHex(undefined);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [designId, snapshotArtworkBackgroundHex]);

  const artworkBackgroundHex = resolveAssistedCatalogShareArtworkBackgroundHex({
    suggestedArtworkBackgroundHex: snapshotArtworkBackgroundHex,
    liveDesignArtworkBackgroundHex: liveArtworkBackgroundHex,
  });

  const alreadyInWorkingRequest = useMemo(() => {
    if (!designId) {
      return false;
    }
    return workingItems.some((item) => item.designId?.trim() === designId);
  }, [designId, workingItems]);

  useEffect(() => {
    let cancelled = false;
    if (!previewPath) {
      setPreviewUrl(null);
      return;
    }
    void catalogStorageService
      .getDownloadUrlForCatalogPath(previewPath)
      .then((next) => {
        if (!cancelled) {
          setPreviewUrl(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewUrl(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [previewPath]);

  if (!designId || request.status !== 'approved') {
    return null;
  }

  const libraryDeepLink = buildPortalDesignDeepLinkPath(designId);

  const runCatalogAddToRequest = () => {
    const uid = getPortalAuth().currentUser?.uid;
    if (!uid || addBusy || alreadyInWorkingRequest || !workingRequestLimit.canAddPrints) {
      return;
    }
    setAddBusy(true);
    setActionError(null);
    setAddSuccess(null);
    setAddProgressError(null);
    setAddProgressPhase('preparing');
    setAddProgressOpen(true);

    const stageTimer = window.setTimeout(() => {
      setAddProgressPhase((current) => (current === 'preparing' ? 'adding' : current));
    }, 1200);

    void ensureWorkingPrintRequestId()
      .then((printRequestId) =>
        portalPrintRequestService.addOrIncrementCatalogDesign({
          printRequestId,
          designId,
          userId: uid,
          quantityDelta: 1,
        }),
      )
      .then(async (result) => {
        window.clearTimeout(stageTimer);
        setAddProgressPhase('adding');
        setAddSuccess(
          result.kind === 'incremented'
            ? 'Already in your Current Request (quantity updated).'
            : 'Added to your Current Request.',
        );
        await Promise.all([
          refreshRequests({ silent: true, printRequestId: result.item.printRequestId }),
          reloadWorkingItems({ silent: true, printRequestId: result.item.printRequestId }),
        ]);
        setAddProgressPhase('done');
        window.setTimeout(() => {
          setAddProgressOpen(false);
          openCurrentRequestDrawer();
        }, 700);
      })
      .catch((error: unknown) => {
        window.clearTimeout(stageTimer);
        const message =
          error instanceof Error ? error.message : 'Unable to add to request.';
        setAddProgressPhase('error');
        setAddProgressError(message);
        setActionError(message);
      })
      .finally(() => {
        setAddBusy(false);
      });
  };

  return (
    <section
      aria-label="Approved library design"
      className="assisted-creation-approved-card"
    >
      <div className="assisted-creation-approved-card-heading">
        <h3 className="assisted-creation-detail-block-title">Approved library design</h3>
        <span className="assisted-creation-status-badge is-approved">Approved</span>
      </div>
      <p className="assisted-creation-catalog-suggestion-title">{title}</p>
      {previewUrl ? (
        <div
          className="assisted-creation-proof-stage"
          style={catalogShareArtworkPreviewStyle(artworkBackgroundHex)}
        >
          <img
            alt={title}
            className="assisted-creation-proof-stage-image"
            src={previewUrl}
          />
        </div>
      ) : (
        <div className="assisted-creation-proof-stage is-empty" aria-hidden="true" />
      )}
      <p className="portal-muted assisted-creation-approved-card-meta">
        This request used a Design Library match — there is no custom proof download. Add the
        catalog design to your Current Request to print.
      </p>
      <div className="assisted-creation-catalog-suggestion-links">
        <button
          className="portal-button portal-button-secondary"
          onClick={() => {
            router.push(libraryDeepLink);
          }}
          type="button"
        >
          View in library
        </button>
      </div>
      <div className="assisted-creation-approved-card-actions">
        <button
          aria-busy={addBusy || undefined}
          className="portal-button portal-button-primary"
          disabled={addBusy || alreadyInWorkingRequest || !workingRequestLimit.canAddPrints}
          onClick={runCatalogAddToRequest}
          title={
            !workingRequestLimit.canAddPrints && workingRequestLimit.exhaustedHelperText
              ? workingRequestLimit.exhaustedStatusText ?? undefined
              : undefined
          }
          type="button"
        >
          {addBusy
            ? 'Adding…'
            : alreadyInWorkingRequest
              ? 'Already in request'
              : 'Add to Request'}
        </button>
      </div>
      {!workingRequestLimit.canAddPrints &&
      workingRequestLimit.exhaustedHelperText &&
      !alreadyInWorkingRequest ? (
        <p className="portal-muted">{workingRequestLimit.exhaustedStatusText}</p>
      ) : null}
      {addSuccess ? <p className="portal-muted">{addSuccess}</p> : null}
      {actionError ? <p className="portal-form-error">{actionError}</p> : null}
      <AssistedAddToRequestProgressModal
        errorMessage={addProgressError}
        isOpen={addProgressOpen}
        onDismiss={() => {
          if (addProgressPhase === 'error' || addProgressPhase === 'done') {
            setAddProgressOpen(false);
            if (addProgressPhase === 'done') {
              openCurrentRequestDrawer();
            }
          }
        }}
        phase={addProgressPhase}
      />
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) {
    return null;
  }
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function ExpandableBlock({
  children,
  defaultOpen = false,
  title,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  title: string;
}) {
  return (
    <details className="assisted-creation-expand-block" open={defaultOpen}>
      <summary className="assisted-creation-expand-summary">{title}</summary>
      <div className="assisted-creation-expand-body">{children}</div>
    </details>
  );
}

/** Staff note attached to a proof — prefer ProofNoteActions for modals; keep for compact status. */
export function StaffProofNote({ note }: { note: string | null | undefined }) {
  const trimmed = note?.trim() ?? '';
  if (!trimmed) {
    return null;
  }
  return (
    <aside aria-label="Note from Fresh Prints" className="assisted-creation-staff-proof-note">
      <p className="assisted-creation-staff-proof-note-label">Note from Fresh Prints</p>
      <p className="assisted-creation-staff-proof-note-text">{trimmed}</p>
    </aside>
  );
}

function ProofNotesModal({
  notes,
  onClose,
  title,
}: {
  notes: string[];
  onClose: () => void;
  title: string;
}) {
  const [canPortal, setCanPortal] = useState(false);
  useEffect(() => {
    setCanPortal(true);
  }, []);

  const node = (
    <div
      aria-modal="true"
      className="modal-overlay modal-overlay-blur assisted-creation-proof-notes-overlay"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="modal-panel assisted-creation-proof-notes-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2>{title}</h2>
        </header>
        <div className="modal-body assisted-creation-proof-notes-modal-body">
          <ul className="assisted-creation-proof-notes-list">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
        <footer className="modal-footer">
          <button className="portal-button portal-button-secondary" onClick={onClose} type="button">
            Close
          </button>
        </footer>
      </div>
    </div>
  );

  return canPortal ? createPortal(node, document.body) : node;
}

/** Single Notes button: staff proof note + linked customer/staff notes (no email system noise). */
export function ProofNoteActions({
  proof,
  proofNumber,
  proofs,
  revisionHistory,
}: {
  proof: AssistedCreationProof;
  proofNumber: number;
  proofs: AssistedCreationProof[];
  revisionHistory: AssistedCreationRequest['revisionHistory'];
}) {
  const [open, setOpen] = useState(false);
  const notes = useMemo(
    () => notesForProof(proof, proofs, revisionHistory),
    [proof, proofs, revisionHistory],
  );

  if (notes.length === 0) {
    return null;
  }

  return (
    <>
      <div className="assisted-creation-proof-note-actions">
        <button
          className="portal-button portal-button-secondary"
          onClick={() => setOpen(true)}
          type="button"
        >
          Notes
        </button>
      </div>
      {open ? (
        <ProofNotesModal
          notes={notes}
          onClose={() => setOpen(false)}
          title={
            isAssistedCreationCatalogShareProof(proof)
              ? 'Design Library · Notes'
              : `Proof ${proofNumber} · Notes`
          }
        />
      ) : null}
    </>
  );
}

function useApprovedProofDownload(request: AssistedCreationRequest) {
  return useMemo(() => {
    if (request.status !== 'approved') {
      return null;
    }
    return evaluateAssistedCreationApprovedProofDownload({
      status: request.status,
      approvedProofId: request.approvedProofId,
      approvedAtMillis: assistedCreationTimestampMillis(request.approvedAt),
      proofs: request.proofs.map((entry) => ({
        id: entry.id,
        storagePath: entry.storagePath,
        fileName: entry.fileName,
        contentType: entry.contentType,
        fullSizePurgedAtMillis: assistedCreationTimestampMillis(entry.fullSizePurgedAt),
      })),
      nowMs: Date.now(),
    });
  }, [request]);
}

/** Compact approved preview + Download / Add to Request for Overview. */
export function AssistedApprovedDesignCard({ request }: { request: AssistedCreationRequest }) {
  const approvedDownload = useApprovedProofDownload(request);
  const {
    openCurrentRequestDrawer,
    reloadWorkingItems,
    refreshRequests,
    workingItems,
    workingRequestLimit,
  } = usePortalPrintRequests();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [libraryConsentOpen, setLibraryConsentOpen] = useState(false);
  const [addProgressOpen, setAddProgressOpen] = useState(false);
  const [addProgressPhase, setAddProgressPhase] =
    useState<AssistedAddToRequestProgressPhase>('preparing');
  const [addProgressError, setAddProgressError] = useState<string | null>(null);

  const ingestUploadId = request.printRequestIngest?.customerUploadId?.trim() || '';
  const ingestItemId = request.printRequestIngest?.printRequestItemId?.trim() || '';

  /**
   * Live “Already in request” — derived from working Current Request line items,
   * not sticky printRequestIngest on the assisted doc (ingest survives remove).
   */
  const alreadyInWorkingRequest = useMemo(() => {
    if (!ingestUploadId && !ingestItemId) {
      return false;
    }
    return workingItems.some((item) => {
      const uploadId = item.customerUploadId?.trim() ?? '';
      if (ingestUploadId && uploadId === ingestUploadId) {
        return true;
      }
      return Boolean(ingestItemId && item.id === ingestItemId);
    });
  }, [ingestItemId, ingestUploadId, workingItems]);

  useEffect(() => {
    if (!alreadyInWorkingRequest && addSuccess) {
      setAddSuccess(null);
    }
  }, [addSuccess, alreadyInWorkingRequest]);

  const addEligibility = useMemo(() => {
    const ingest = request.printRequestIngest;
    return evaluateAssistedApprovedProofAddToRequest({
      status: request.status,
      approvedProofId: request.approvedProofId,
      approvedAtMillis: assistedCreationTimestampMillis(request.approvedAt),
      proofs: request.proofs.map((entry) => ({
        id: entry.id,
        storagePath: entry.storagePath,
        fileName: entry.fileName,
        contentType: entry.contentType,
        fullSizePurgedAtMillis: assistedCreationTimestampMillis(entry.fullSizePurgedAt),
      })),
      printRequestIngest:
        ingest &&
        typeof ingest.customerUploadId === 'string' &&
        typeof ingest.printRequestItemId === 'string' &&
        typeof ingest.printRequestId === 'string'
          ? {
              customerUploadId: ingest.customerUploadId,
              printRequestItemId: ingest.printRequestItemId,
              printRequestId: ingest.printRequestId,
              assistedProofId: ingest.assistedProofId,
            }
          : null,
      nowMs: Date.now(),
    });
  }, [request]);

  const previewPath =
    request.status === 'approved' && request.finalSource?.storagePath
      ? request.finalSource.storagePath
      : approvedDownload?.eligible && approvedDownload.proof?.storagePath
        ? approvedDownload.proof.storagePath
        : approvedDownload?.proof?.storagePath;

  const previewContentType =
    request.status === 'approved' && request.finalSource?.contentType
      ? request.finalSource.contentType
      : approvedDownload?.proof?.contentType;

  useEffect(() => {
    let cancelled = false;
    if (
      !previewPath?.trim() ||
      (approvedDownload?.proof?.fullSizePurgedAtMillis != null && !request.finalSource)
    ) {
      setPreviewUrl((previous) => {
        if (previous?.startsWith('blob:')) {
          URL.revokeObjectURL(previous);
        }
        return null;
      });
      return;
    }
    void assistedCreationService
      .getPreviewObjectUrl(previewPath, previewContentType)
      .then((next) => {
        if (!cancelled) {
          setPreviewUrl((previous) => {
            if (previous?.startsWith('blob:')) {
              URL.revokeObjectURL(previous);
            }
            return next;
          });
        } else if (next.startsWith('blob:')) {
          URL.revokeObjectURL(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewUrl(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    approvedDownload?.proof?.fullSizePurgedAtMillis,
    previewContentType,
    previewPath,
    request.finalSource,
  ]);

  const hasFinalSource = Boolean(request.finalSource?.storagePath);
  const showDownload =
    Boolean(approvedDownload?.eligible && approvedDownload.proof?.storagePath) ||
    (request.status === 'approved' && hasFinalSource);
  const showAdd = addEligibility.eligible;
  const alreadyInRequest = alreadyInWorkingRequest;

  if (!approvedDownload && !addEligibility.eligible && !hasFinalSource) {
    return null;
  }

  const runAddToRequest = (catalogUseAcknowledged: boolean) => {
    const requestId = request.id?.trim();
    if (!requestId || addBusy || alreadyInRequest) {
      return;
    }
    setLibraryConsentOpen(false);
    setAddBusy(true);
    setActionError(null);
    setAddSuccess(null);
    setAddProgressError(null);
    setAddProgressPhase('preparing');
    setAddProgressOpen(true);

    const stageTimer = window.setTimeout(() => {
      setAddProgressPhase((current) => (current === 'preparing' ? 'adding' : current));
    }, 1200);

    void assistedCreationService
      .addApprovedProofToPrintRequest(requestId, { catalogUseAcknowledged })
      .then(async (result) => {
        window.clearTimeout(stageTimer);
        setAddProgressPhase('adding');
        setAddSuccess(
          result.alreadyAttached
            ? 'Already in your Current Request.'
            : 'Added to your Current Request.',
        );
        await Promise.all([
          refreshRequests({ silent: true, printRequestId: result.printRequestId }),
          reloadWorkingItems({ silent: true, printRequestId: result.printRequestId }),
        ]);
        setAddProgressPhase('done');
        window.setTimeout(() => {
          setAddProgressOpen(false);
          openCurrentRequestDrawer();
        }, 700);
      })
      .catch((error: unknown) => {
        window.clearTimeout(stageTimer);
        const message =
          error instanceof Error ? error.message : 'Unable to add to request.';
        setAddProgressPhase('error');
        setAddProgressError(message);
        setActionError(message);
      })
      .finally(() => {
        setAddBusy(false);
      });
  };

  return (
    <section
      aria-label="Approved design"
      className="assisted-creation-approved-card"
    >
      <div className="assisted-creation-approved-card-heading">
        <h3 className="assisted-creation-detail-block-title">Approved design</h3>
        <span className="assisted-creation-status-badge is-approved">Approved</span>
      </div>
      {previewUrl ? (
        <div className="assisted-creation-proof-stage">
          <img
            alt="Approved design"
            className="assisted-creation-proof-stage-image"
            draggable={false}
            src={previewUrl}
          />
        </div>
      ) : (
        <div className="assisted-creation-proof-stage is-empty" aria-hidden="true" />
      )}
      {showDownload ? (
        <p className="portal-muted assisted-creation-approved-card-meta">
          {hasFinalSource
            ? 'Download your final artwork within 14 days of approval'
            : 'Download your approved design within 14 days of approval'}
          {approvedDownload?.expiresAtMillis
            ? ` (available until ${formatAssistedWhen(approvedDownload.expiresAtMillis)})`
            : ''}
          . Preview grey is display-only; PNG keeps transparency. Add to Request to print.
          That copy is kept after the download window ends.
        </p>
      ) : alreadyInRequest ? (
        <p className="portal-muted assisted-creation-approved-card-meta">
          This design is already in your Current Request. The full-resolution download window may
          have ended.
        </p>
      ) : (
        <p className="portal-muted">
          {approvedDownload?.reason === 'expired' ||
          approvedDownload?.reason === 'full_size_purged'
            ? 'The 14-day download window has ended. The full-resolution file is no longer available.'
            : 'A full-resolution download is not available for this request.'}
        </p>
      )}
      {showDownload || showAdd ? (
        <div className="assisted-creation-approved-card-actions">
          {showDownload ? (
            <button
              aria-busy={downloadBusy || undefined}
              className="portal-button portal-button-primary"
              disabled={downloadBusy || addBusy}
              onClick={() => {
                const requestId = request.id?.trim();
                if (!requestId || downloadBusy) {
                  return;
                }
                setDownloadBusy(true);
                setActionError(null);
                void assistedCreationService
                  .downloadApprovedProof(requestId)
                  .catch((error: unknown) => {
                    setActionError(
                      error instanceof Error ? error.message : 'Unable to download.',
                    );
                  })
                  .finally(() => {
                    setDownloadBusy(false);
                  });
              }}
              type="button"
            >
              {downloadBusy
                ? 'Downloading…'
                : hasFinalSource
                  ? 'Download Final Artwork'
                  : isAssistedCreationProofPng(approvedDownload?.proof?.contentType)
                    ? 'Download PNG'
                    : 'Download file'}
            </button>
          ) : null}
          {showAdd ? (
            <button
              aria-busy={addBusy || undefined}
              className="portal-button portal-button-secondary"
              disabled={addBusy || downloadBusy || alreadyInRequest || !workingRequestLimit.canAddPrints}
              onClick={() => {
                if (addBusy || alreadyInRequest || !workingRequestLimit.canAddPrints) {
                  return;
                }
                setActionError(null);
                setLibraryConsentOpen(true);
              }}
              title={
                !workingRequestLimit.canAddPrints && workingRequestLimit.exhaustedHelperText
                  ? workingRequestLimit.exhaustedStatusText ?? undefined
                  : undefined
              }
              type="button"
            >
              {addBusy
                ? 'Adding…'
                : alreadyInRequest
                  ? 'Already in request'
                  : 'Add to Request'}
            </button>
          ) : null}
        </div>
      ) : null}
      {!workingRequestLimit.canAddPrints && workingRequestLimit.exhaustedHelperText && showAdd && !alreadyInRequest ? (
        <p className="portal-muted">
          {workingRequestLimit.exhaustedStatusText}
        </p>
      ) : null}
      {addSuccess ? <p className="portal-muted">{addSuccess}</p> : null}
      {actionError ? <p className="portal-form-error">{actionError}</p> : null}
      <AssistedLibraryListingConsentModal
        isBusy={addBusy}
        isOpen={libraryConsentOpen}
        onAllow={() => runAddToRequest(true)}
        onDecline={() => runAddToRequest(false)}
        onDismiss={() => {
          if (!addBusy) {
            setLibraryConsentOpen(false);
          }
        }}
      />
      <AssistedAddToRequestProgressModal
        errorMessage={addProgressError}
        isOpen={addProgressOpen}
        onDismiss={() => {
          if (addProgressPhase === 'error' || addProgressPhase === 'done') {
            setAddProgressOpen(false);
            if (addProgressPhase === 'done') {
              openCurrentRequestDrawer();
            }
          }
        }}
        phase={addProgressPhase}
      />
    </section>
  );
}

export function AssistedCreationBriefAndDetails({ request }: { request: AssistedCreationRequest }) {
  const answers = request.answers;
  const description = answers?.rawDescription?.trim() || 'No description';

  return (
    <div className="assisted-creation-detail-stack assisted-creation-detail-stack--dense">
      {request.status === 'approved' ? (
        request.approvedCatalogDesignId ? (
          <AssistedApprovedCatalogDesignCard request={request} />
        ) : (
          <AssistedApprovedDesignCard request={request} />
        )
      ) : null}

      <ExpandableBlock defaultOpen={request.status !== 'approved'} title="Brief">
        <p className="assisted-creation-detail-brief">{description}</p>
      </ExpandableBlock>

      <ExpandableBlock title="Request details">
        <dl className="assisted-creation-detail-rows">
          {buildAssistedCreationAnswerDisplayRows(answers).map((row) => (
            <DetailRow key={row.label} label={row.label} value={row.value} />
          ))}
          {request.customerRating != null ? (
            <DetailRow label="Your rating" value={`${request.customerRating} / 5`} />
          ) : null}
          {request.customerApprovalNote?.trim() ? (
            <DetailRow label="Approval note" value={request.customerApprovalNote.trim()} />
          ) : null}
        </dl>
      </ExpandableBlock>

      <ExpandableBlock title={`References (${request.referenceImages?.length ?? 0})`}>
        <AssistedCreationMediaThumbs
          emptyLabel="No reference images."
          items={request.referenceImages ?? []}
          variant="reference"
        />
      </ExpandableBlock>
    </div>
  );
}

function ProofDetailModal({
  onClose,
  proof,
  proofNumber,
  request,
}: {
  onClose: () => void;
  proof: AssistedCreationProof;
  proofNumber: number;
  request: AssistedCreationRequest;
}) {
  const router = useRouter();
  const isCatalogShare = isAssistedCreationCatalogShareProof(proof);
  const catalogTitle = assistedCreationCatalogShareProofTitle(proof);
  const catalogDesignId = proof.catalogDesignId?.trim() || '';
  const catalogPreviewPath = proof.catalogPreviewImageUrl?.trim() || '';
  const snapshotCatalogArtworkBackgroundHex = resolveAssistedCatalogShareArtworkBackgroundHex({
    suggestedArtworkBackgroundHex: request.suggestedCatalogDesign?.artworkBackgroundHex,
    proofCatalogArtworkBackgroundHex: proof.catalogArtworkBackgroundHex,
  });
  const [liveCatalogArtworkBackgroundHex, setLiveCatalogArtworkBackgroundHex] = useState<
    string | undefined
  >(undefined);
  const [url, setUrl] = useState<string | null>(null);
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const [canPortal, setCanPortal] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (
      !isCatalogShare ||
      !needsAssistedCatalogShareArtworkBackgroundLiveResolve({
        suggestedArtworkBackgroundHex: snapshotCatalogArtworkBackgroundHex,
      }) ||
      !catalogDesignId
    ) {
      setLiveCatalogArtworkBackgroundHex(undefined);
      return;
    }
    let cancelled = false;
    void catalogService
      .getReadyDesignsByIds([catalogDesignId])
      .then((designs) => {
        if (!cancelled) {
          setLiveCatalogArtworkBackgroundHex(
            snapshotAssistedCatalogArtworkBackgroundHex(designs[0]?.artworkBackgroundHex),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLiveCatalogArtworkBackgroundHex(undefined);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [catalogDesignId, isCatalogShare, snapshotCatalogArtworkBackgroundHex]);

  const catalogArtworkBackgroundHex = resolveAssistedCatalogShareArtworkBackgroundHex({
    suggestedArtworkBackgroundHex: snapshotCatalogArtworkBackgroundHex,
    liveDesignArtworkBackgroundHex: liveCatalogArtworkBackgroundHex,
  });

  const isApprovedCatalog =
    isCatalogShare &&
    Boolean(request.approvedCatalogDesignId) &&
    catalogDesignId === request.approvedCatalogDesignId?.trim();

  const approvedDownload = useMemo(() => {
    if (isCatalogShare || request.status !== 'approved') {
      return null;
    }
    const result = evaluateAssistedCreationApprovedProofDownload({
      status: request.status,
      approvedProofId: request.approvedProofId,
      approvedAtMillis: assistedCreationTimestampMillis(request.approvedAt),
      proofs: request.proofs.map((entry) => ({
        id: entry.id,
        storagePath: entry.storagePath,
        fileName: entry.fileName,
        contentType: entry.contentType,
        fullSizePurgedAtMillis: assistedCreationTimestampMillis(entry.fullSizePurgedAt),
        ...(entry.kind === 'catalog_share' || entry.kind === 'proof_image'
          ? { kind: entry.kind }
          : {}),
      })),
      nowMs: Date.now(),
    });
    const resolvedId = resolveAssistedCreationApprovedProofId(
      request.approvedProofId,
      request.proofs.map((entry) => ({ id: entry.id })),
    );
    if (resolvedId !== proof.id) {
      return null;
    }
    return result;
  }, [isCatalogShare, proof.id, request]);

  useEffect(() => {
    setCanPortal(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (isCatalogShare) {
      if (!catalogPreviewPath) {
        setUrl(null);
        setImageUnavailable(true);
        return;
      }
      setImageUnavailable(false);
      void catalogStorageService
        .getDownloadUrlForCatalogPath(catalogPreviewPath)
        .then((next) => {
          if (!cancelled) {
            setUrl(next);
            setImageUnavailable(!next);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setUrl(null);
            setImageUnavailable(true);
          }
        });
      return () => {
        cancelled = true;
      };
    }
    if (proof.fullSizePurgedAt != null || !proof.storagePath?.trim()) {
      setUrl(null);
      setImageUnavailable(true);
      return;
    }
    setImageUnavailable(false);
    void assistedCreationService
      .getPreviewObjectUrl(proof.storagePath, proof.contentType)
      .then((next) => {
        if (!cancelled) {
          setUrl((previous) => {
            if (typeof previous === 'string' && previous.startsWith('blob:')) {
              URL.revokeObjectURL(previous);
            }
            return next;
          });
        } else if (next.startsWith('blob:')) {
          URL.revokeObjectURL(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUrl(null);
          setImageUnavailable(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    catalogPreviewPath,
    isCatalogShare,
    proof.contentType,
    proof.fullSizePurgedAt,
    proof.storagePath,
  ]);

  const libraryDeepLink = catalogDesignId
    ? buildPortalDesignDeepLinkPath(catalogDesignId)
    : '';

  const node = (
    <div
      aria-modal="true"
      className="modal-overlay modal-overlay-blur assisted-creation-proof-modal-overlay"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="modal-panel assisted-creation-proof-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header assisted-creation-proof-modal-header">
          <h2 id="assisted-creation-proof-modal-title">
            {isCatalogShare ? 'Design Library' : `Proof ${proofNumber}`}
          </h2>
          {approvedDownload || isApprovedCatalog ? (
            <span className="assisted-creation-status-badge is-approved">Approved</span>
          ) : null}
        </header>
        <div className="modal-body assisted-creation-proof-modal-body">
          {url ? (
            <div
              className="assisted-creation-proof-stage"
              style={
                isCatalogShare
                  ? catalogShareArtworkPreviewStyle(catalogArtworkBackgroundHex)
                  : undefined
              }
            >
              <img
                alt={isCatalogShare ? catalogTitle : `Proof ${proofNumber}`}
                className="assisted-creation-proof-stage-image"
                src={url}
              />
            </div>
          ) : (
            <p className="portal-muted">
              {imageUnavailable
                ? isCatalogShare
                  ? 'Preview is unavailable for this library design.'
                  : proof.fullSizePurgedAt != null || !proof.storagePath?.trim()
                    ? 'This proof file is no longer available.'
                    : 'Preview unavailable.'
                : isCatalogShare
                  ? 'Loading library design…'
                  : 'Loading proof…'}
            </p>
          )}
          <dl className="assisted-creation-proof-summary">
            {isCatalogShare ? (
              <>
                <DetailRow label="Type" value="Design Library recommendation" />
                <DetailRow label="Design" value={catalogTitle} />
              </>
            ) : approvedDownload ? (
              <DetailRow label="Status" value="Approved proof" />
            ) : null}
            <DetailRow label="Sent" value={formatAssistedWhen(proof.createdAt)} />
          </dl>
          {isCatalogShare && libraryDeepLink ? (
            <div className="assisted-creation-catalog-suggestion-links">
              <button
                className="portal-button portal-button-secondary"
                onClick={() => {
                  router.push(libraryDeepLink);
                }}
                type="button"
              >
                View in library
              </button>
            </div>
          ) : null}
          <div className="assisted-creation-proof-modal-actions">
            <ProofNoteActions
              proof={proof}
              proofNumber={proofNumber}
              proofs={request.proofs ?? []}
              revisionHistory={request.revisionHistory}
            />
          </div>
          {!isCatalogShare && approvedDownload?.eligible && approvedDownload.proof?.storagePath ? (
            <p className="portal-muted assisted-creation-proof-download-hint">
              Download within 14 days of approval
              {approvedDownload.expiresAtMillis
                ? ` (available until ${formatAssistedWhen(approvedDownload.expiresAtMillis)})`
                : ''}
              . Preview grey is display-only; PNG keeps transparency.
            </p>
          ) : null}
          {!isCatalogShare &&
          approvedDownload &&
          !approvedDownload.eligible &&
          (approvedDownload.reason === 'expired' ||
            approvedDownload.reason === 'full_size_purged') ? (
            <p className="portal-muted assisted-creation-proof-download-hint">
              The 14-day download window has ended. The full-resolution file is no longer available.
            </p>
          ) : null}
          {downloadError ? <p className="portal-form-error">{downloadError}</p> : null}
        </div>
        <footer className="modal-footer assisted-creation-proof-modal-footer">
          <button className="portal-button portal-button-secondary" onClick={onClose} type="button">
            Close
          </button>
          {!isCatalogShare &&
          request.status === 'approved' &&
          (Boolean(request.finalSource?.storagePath) ||
            (approvedDownload?.eligible && approvedDownload.proof?.storagePath)) ? (
            <button
              aria-busy={downloadBusy || undefined}
              className="portal-button portal-button-primary"
              disabled={downloadBusy}
              onClick={() => {
                const requestId = request.id?.trim();
                if (!requestId || downloadBusy) {
                  return;
                }
                setDownloadBusy(true);
                setDownloadError(null);
                void assistedCreationService
                  .downloadApprovedProof(requestId)
                  .catch((error: unknown) => {
                    setDownloadError(
                      error instanceof Error ? error.message : 'Unable to download.',
                    );
                  })
                  .finally(() => {
                    setDownloadBusy(false);
                  });
              }}
              type="button"
            >
              {downloadBusy
                ? 'Downloading…'
                : request.finalSource?.storagePath
                  ? 'Download Final Artwork'
                  : isAssistedCreationProofPng(approvedDownload?.proof?.contentType)
                    ? 'Download PNG'
                    : 'Download file'}
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );

  return canPortal ? createPortal(node, document.body) : node;
}

function ProofListThumb({
  fallbackArtworkBackgroundHex,
  proof,
}: {
  fallbackArtworkBackgroundHex?: string;
  proof: AssistedCreationProof;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const isCatalogShare = isAssistedCreationCatalogShareProof(proof);
  const catalogPreviewPath = proof.catalogPreviewImageUrl?.trim() || '';
  const artworkBackgroundHex = resolveAssistedCatalogShareArtworkBackgroundHex({
    suggestedArtworkBackgroundHex: fallbackArtworkBackgroundHex,
    proofCatalogArtworkBackgroundHex: proof.catalogArtworkBackgroundHex,
  });
  const unavailable = isCatalogShare
    ? !catalogPreviewPath
    : proof.fullSizePurgedAt != null || !proof.storagePath?.trim();

  useEffect(() => {
    let cancelled = false;
    if (unavailable) {
      setUrl(null);
      return;
    }
    if (isCatalogShare) {
      void catalogStorageService
        .getDownloadUrlForCatalogPath(catalogPreviewPath)
        .then((next) => {
          if (!cancelled) {
            setUrl(next);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setUrl(null);
          }
        });
      return () => {
        cancelled = true;
      };
    }
    void assistedCreationService
      .getPreviewObjectUrl(proof.storagePath, proof.contentType)
      .then((next) => {
        if (!cancelled) {
          setUrl((previous) => {
            if (typeof previous === 'string' && previous.startsWith('blob:')) {
              URL.revokeObjectURL(previous);
            }
            return next;
          });
        } else if (next.startsWith('blob:')) {
          URL.revokeObjectURL(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUrl(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [catalogPreviewPath, isCatalogShare, proof.contentType, proof.storagePath, unavailable]);

  if (unavailable || !url) {
    return (
      <span aria-hidden="true" className="assisted-creation-proof-row-placeholder" />
    );
  }

  return (
    <img
      alt=""
      className="assisted-creation-proof-row-thumb"
      src={url}
      style={
        isCatalogShare ? catalogShareArtworkPreviewStyle(artworkBackgroundHex) : undefined
      }
    />
  );
}

export function AssistedCreationProofsPanel({ request }: { request: AssistedCreationRequest }) {
  const proofsAsc = useMemo(() => request.proofs ?? [], [request.proofs]);
  const proofsNewestFirst = useMemo(
    () =>
      [...proofsAsc].sort(
        (a, b) => proofCreatedAtMillis(b.createdAt) - proofCreatedAtMillis(a.createdAt),
      ),
    [proofsAsc],
  );
  const approvedProofId = useMemo(() => {
    if (request.status !== 'approved') {
      return '';
    }
    return resolveAssistedCreationApprovedProofId(
      request.approvedProofId,
      (request.proofs ?? []).map((proof) => ({ id: proof.id })),
    );
  }, [request.approvedProofId, request.proofs, request.status]);
  const [selectedProofId, setSelectedProofId] = useState<string | null>(null);
  const selectedProof = useMemo(
    () => proofsNewestFirst.find((proof) => proof.id === selectedProofId) ?? null,
    [proofsNewestFirst, selectedProofId],
  );
  const selectedProofNumber =
    selectedProof == null ? 0 : chronologicalProofNumber(proofsAsc, selectedProof.id);

  const snapshotListArtworkBackgroundHex = resolveAssistedCatalogShareArtworkBackgroundHex({
    suggestedArtworkBackgroundHex: request.suggestedCatalogDesign?.artworkBackgroundHex,
    proofCatalogArtworkBackgroundHex: proofsNewestFirst.find((proof) =>
      isAssistedCreationCatalogShareProof(proof),
    )?.catalogArtworkBackgroundHex,
  });
  const catalogDesignIdForListBg =
    request.suggestedCatalogDesign?.designId?.trim() ||
    proofsNewestFirst
      .find((proof) => isAssistedCreationCatalogShareProof(proof))
      ?.catalogDesignId?.trim() ||
    '';
  const [liveListArtworkBackgroundHex, setLiveListArtworkBackgroundHex] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    if (
      !catalogDesignIdForListBg ||
      !needsAssistedCatalogShareArtworkBackgroundLiveResolve({
        suggestedArtworkBackgroundHex: snapshotListArtworkBackgroundHex,
      })
    ) {
      setLiveListArtworkBackgroundHex(undefined);
      return;
    }
    let cancelled = false;
    void catalogService
      .getReadyDesignsByIds([catalogDesignIdForListBg])
      .then((designs) => {
        if (!cancelled) {
          setLiveListArtworkBackgroundHex(
            snapshotAssistedCatalogArtworkBackgroundHex(designs[0]?.artworkBackgroundHex),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLiveListArtworkBackgroundHex(undefined);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [catalogDesignIdForListBg, snapshotListArtworkBackgroundHex]);

  const listArtworkBackgroundHex = resolveAssistedCatalogShareArtworkBackgroundHex({
    suggestedArtworkBackgroundHex: snapshotListArtworkBackgroundHex,
    liveDesignArtworkBackgroundHex: liveListArtworkBackgroundHex,
  });

  return (
    <div className="assisted-creation-detail-stack assisted-creation-detail-stack--dense">
      <section className="assisted-creation-detail-block">
        <h3 className="assisted-creation-detail-block-title">Proofs</h3>
        {proofsNewestFirst.length === 0 ? (
          <p className="portal-muted">No proofs yet.</p>
        ) : (
          <ul className="assisted-creation-proof-list">
            {proofsNewestFirst.map((proof, index) => {
              const isCatalogShare = isAssistedCreationCatalogShareProof(proof);
              const proofNumber = chronologicalProofNumber(proofsAsc, proof.id);
              const isApprovedProof =
                !isCatalogShare && Boolean(approvedProofId) && proof.id === approvedProofId;
              const isApprovedCatalog =
                isCatalogShare &&
                Boolean(request.approvedCatalogDesignId) &&
                proof.catalogDesignId?.trim() === request.approvedCatalogDesignId?.trim();
              const catalogTitle = assistedCreationCatalogShareProofTitle(proof);
              return (
                <li key={proof.id}>
                  <button
                    className="assisted-creation-proof-row"
                    onClick={() => setSelectedProofId(proof.id)}
                    type="button"
                  >
                    <ProofListThumb
                      fallbackArtworkBackgroundHex={listArtworkBackgroundHex}
                      proof={proof}
                    />
                    <span className="assisted-creation-proof-row-body">
                      <span className="assisted-creation-proof-row-title">
                        <span>
                          {isCatalogShare ? (
                            <>
                              Design Library
                              {index === 0 ? ' (latest)' : ''}
                              <span className="portal-muted"> · {catalogTitle}</span>
                            </>
                          ) : (
                            <>
                              Proof {proofNumber}
                              {index === 0 ? ' (latest)' : ''}
                            </>
                          )}
                        </span>
                        {isApprovedProof || isApprovedCatalog ? (
                          <span className="assisted-creation-status-badge is-approved">
                            Approved
                          </span>
                        ) : null}
                      </span>
                      <span className="assisted-creation-proof-row-meta">
                        {isCatalogShare ? 'Design Library · ' : ''}
                        {formatAssistedWhen(proof.createdAt) || 'Sent'}
                        {notesForProof(proof, proofsAsc, request.revisionHistory).length > 0
                          ? ' · Notes'
                          : ''}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {selectedProof ? (
        <ProofDetailModal
          onClose={() => setSelectedProofId(null)}
          proof={selectedProof}
          proofNumber={selectedProofNumber}
          request={request}
        />
      ) : null}
    </div>
  );
}

export function AssistedCreationMessagesPanel({ request }: { request: AssistedCreationRequest }) {
  const history = buildAssistedHistoryEntries(request.revisionHistory);
  const messagingOpen = canSendAssistedCreationMessage(request.status);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) {
      thread.scrollTop = thread.scrollHeight;
    }
  }, [history.length, request.id]);

  async function handleSend(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || sending || !messagingOpen) {
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      await assistedCreationService.sendMessage({ requestId: request.id, message: trimmed });
      setMessage('');
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Unable to send your message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="assisted-creation-detail-stack assisted-creation-detail-stack--dense">
      <section className="assisted-creation-detail-block assisted-creation-messages-panel">
        <h3 className="assisted-creation-detail-block-title">Messages</h3>
        <div
          aria-label="Request messages"
          className="assisted-creation-messages-thread"
          ref={threadRef}
          tabIndex={0}
        >
          {history.length === 0 ? (
            <p className="portal-muted">No messages yet.</p>
          ) : (
            <ol className="assisted-creation-history-chat">
              {history.map((entry) => (
                <li
                  className={`assisted-creation-history-chat-row is-${entry.actor}`}
                  key={entry.key}
                >
                  <div className="assisted-creation-history-chat-meta">
                    <span className="assisted-creation-history-chat-role">{entry.roleLabel}</span>
                    {entry.when ? (
                      <span className="assisted-creation-history-chat-when">{entry.when}</span>
                    ) : null}
                  </div>
                  <div className="assisted-creation-history-chat-bubble">
                    <strong className="assisted-creation-history-chat-title">{entry.title}</strong>
                    {entry.note ? (
                      <p className="assisted-creation-history-chat-note">{entry.note}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
        {messagingOpen ? (
          <form className="assisted-creation-message-composer" onSubmit={(event) => void handleSend(event)}>
            <label className="assisted-creation-message-label" htmlFor={`assisted-message-${request.id}`}>
              Send a message
            </label>
            <textarea
              aria-describedby={`assisted-message-help-${request.id}`}
              className="assisted-creation-message-input"
              disabled={sending}
              id={`assisted-message-${request.id}`}
              maxLength={ASSISTED_CREATION_MESSAGE_MAX_LENGTH}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') {
                  return;
                }
                event.preventDefault();
                if (sending || !message.trim()) {
                  return;
                }
                event.currentTarget.form?.requestSubmit();
              }}
              placeholder="Add a note for Fresh Prints"
              rows={3}
              value={message}
            />
            <div className="assisted-creation-message-composer-meta">
              <span className="portal-muted" id={`assisted-message-help-${request.id}`}>
                Messaging does not change or reopen the request status.
              </span>
              <span className="portal-muted">
                {message.length}/{ASSISTED_CREATION_MESSAGE_MAX_LENGTH}
              </span>
            </div>
            {sendError ? (
              <p aria-live="polite" className="portal-form-error">
                {sendError}
              </p>
            ) : null}
            <div className="assisted-creation-message-send-wrap">
              <button
                className="portal-button portal-button-primary assisted-creation-message-send"
                disabled={sending || !message.trim()}
                type="submit"
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
              <span className="portal-muted assisted-creation-message-send-tip">
                Ctrl + Enter to send
              </span>
            </div>
          </form>
        ) : (
          <p className="portal-muted" role="status">
            {ASSISTED_CREATION_MESSAGING_CLOSED_MESSAGE}
          </p>
        )}
      </section>
    </div>
  );
}

type AssistedDetailTab = 'overview' | 'proofs' | 'messages';

interface AssistedCreationDetailTabsProps {
  activeTab: AssistedDetailTab;
  onTabChange: (tab: AssistedDetailTab) => void;
  request: AssistedCreationRequest;
  tabListLabel?: string;
}

export function AssistedCreationDetailTabs({
  activeTab,
  onTabChange,
  request,
  tabListLabel = 'Request sections',
}: AssistedCreationDetailTabsProps) {
  return (
    <div className="assisted-creation-detail-tabs">
      <div aria-label={tabListLabel} className="assisted-creation-tab-bar" role="tablist">
        <button
          aria-selected={activeTab === 'overview'}
          className={`assisted-creation-tab-button${activeTab === 'overview' ? ' is-active' : ''}`}
          onClick={() => onTabChange('overview')}
          role="tab"
          type="button"
        >
          Overview
        </button>
        <button
          aria-selected={activeTab === 'proofs'}
          className={`assisted-creation-tab-button${activeTab === 'proofs' ? ' is-active' : ''}`}
          onClick={() => onTabChange('proofs')}
          role="tab"
          type="button"
        >
          Proofs
        </button>
        <button
          aria-selected={activeTab === 'messages'}
          className={`assisted-creation-tab-button${activeTab === 'messages' ? ' is-active' : ''}`}
          onClick={() => onTabChange('messages')}
          role="tab"
          type="button"
        >
          Messages
        </button>
      </div>
      <div className="assisted-creation-tab-panel" role="tabpanel">
        {activeTab === 'overview' ? (
          <AssistedCreationBriefAndDetails request={request} />
        ) : activeTab === 'proofs' ? (
          <AssistedCreationProofsPanel request={request} />
        ) : (
          <AssistedCreationMessagesPanel request={request} />
        )}
      </div>
    </div>
  );
}

export type { AssistedDetailTab };
