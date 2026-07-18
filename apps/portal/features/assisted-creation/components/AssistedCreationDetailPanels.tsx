'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import {
  ASSISTED_CREATION_MESSAGE_MAX_LENGTH,
  ASSISTED_CREATION_MESSAGING_CLOSED_MESSAGE,
  canSendAssistedCreationMessage,
} from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';
import type {
  AssistedCreationProof,
  AssistedCreationRequest,
} from '@fresh-prints/shared/types/assistedCreation/assistedCreation.types';
import {
  evaluateAssistedCreationApprovedProofDownload,
  isAssistedCreationProofPng,
  resolveAssistedCreationApprovedProofId,
} from '@fresh-prints/shared/utils/assistedCreationApprovedProofRetention';

import {
  joinLabeledValues,
  labelForComposition,
  labelForContainsText,
  labelForExactRequirement,
  labelForFlexibility,
  labelForPersonalization,
  labelForRequestType,
  labelForStyle,
} from '../utils/assistedCreationLabels';
import {
  assistedCreationTimestampMillis,
  buildAssistedHistoryEntries,
  formatAssistedWhen,
  notesForProof,
} from '../utils/assistedCreationDisplay';
import { assistedCreationService } from '../services/assistedCreationService';
import { AssistedCreationMediaThumbs } from './AssistedCreationMediaThumbs';

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

/** Chronological proof number (1 = oldest). Independent of Proofs-tab display sort. */
function chronologicalProofNumber(
  proofsAsc: AssistedCreationProof[],
  proofId: string,
): number {
  const index = proofsAsc.findIndex((proof) => proof.id === proofId);
  return index >= 0 ? index + 1 : 0;
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
          title={`Proof ${proofNumber} · Notes`}
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

/** Compact approved preview + Download for Overview / status. */
export function AssistedApprovedDesignCard({ request }: { request: AssistedCreationRequest }) {
  const approvedDownload = useApprovedProofDownload(request);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const previewPath =
    approvedDownload?.eligible && approvedDownload.proof?.storagePath
      ? approvedDownload.proof.storagePath
      : approvedDownload?.proof?.storagePath;

  useEffect(() => {
    let cancelled = false;
    if (!previewPath?.trim() || approvedDownload?.proof?.fullSizePurgedAtMillis != null) {
      setPreviewUrl(null);
      return;
    }
    void assistedCreationService
      .getDownloadUrl(previewPath)
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
  }, [approvedDownload?.proof?.fullSizePurgedAtMillis, previewPath]);

  if (!approvedDownload) {
    return null;
  }

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Approved design"
            className="assisted-creation-proof-stage-image"
            src={previewUrl}
          />
        </div>
      ) : (
        <div className="assisted-creation-proof-stage is-empty" aria-hidden="true" />
      )}
      {approvedDownload.eligible && approvedDownload.proof?.storagePath ? (
        <>
          <p className="portal-muted assisted-creation-approved-card-meta">
            Download your approved design within 14 days of approval
            {approvedDownload.expiresAtMillis
              ? ` (available until ${formatAssistedWhen(approvedDownload.expiresAtMillis)})`
              : ''}
            . Preview grey is display-only; PNG keeps transparency.
          </p>
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
              : isAssistedCreationProofPng(approvedDownload.proof.contentType)
                ? 'Download PNG'
                : 'Download file'}
          </button>
        </>
      ) : (
        <p className="portal-muted">
          {approvedDownload.reason === 'expired' ||
          approvedDownload.reason === 'full_size_purged'
            ? 'The 14-day download window has ended. The full-resolution file is no longer available.'
            : 'A full-resolution download is not available for this request.'}
        </p>
      )}
      {downloadError ? <p className="portal-form-error">{downloadError}</p> : null}
    </section>
  );
}

export function AssistedCreationBriefAndDetails({ request }: { request: AssistedCreationRequest }) {
  const answers = request.answers;
  const description = answers?.rawDescription?.trim() || 'No description';

  return (
    <div className="assisted-creation-detail-stack assisted-creation-detail-stack--dense">
      {request.status === 'approved' ? <AssistedApprovedDesignCard request={request} /> : null}

      <ExpandableBlock defaultOpen={request.status !== 'approved'} title="Brief">
        <p className="assisted-creation-detail-brief">{description}</p>
      </ExpandableBlock>

      <ExpandableBlock title="Request details">
        <dl className="assisted-creation-detail-rows">
          <DetailRow
            label="Request type"
            value={answers?.requestType ? labelForRequestType(answers.requestType) : ''}
          />
          <DetailRow
            label="Wording"
            value={answers?.containsText ? labelForContainsText(answers.containsText) : ''}
          />
          <DetailRow label="Exact text" value={answers?.exactText?.trim() ?? ''} />
          <DetailRow label="Primary subject" value={answers?.primarySubject?.trim() ?? ''} />
          <DetailRow label="Additional subjects" value={answers?.additionalSubjects?.trim() ?? ''} />
          <DetailRow label="Action" value={answers?.subjectAction?.trim() ?? ''} />
          <DetailRow label="Props" value={answers?.props?.trim() ?? ''} />
          <DetailRow label="Setting" value={answers?.setting?.trim() ?? ''} />
          <DetailRow label="Occasion" value={answers?.occasion?.trim() ?? ''} />
          <DetailRow label="Audience" value={answers?.audience?.trim() ?? ''} />
          <DetailRow
            label="Personalization"
            value={joinLabeledValues(answers?.personalizationTypes, labelForPersonalization)}
          />
          <DetailRow
            label="Flexibility"
            value={answers?.flexibilityLevel ? labelForFlexibility(answers.flexibilityLevel) : ''}
          />
          <DetailRow
            label="Must match references"
            value={joinLabeledValues(answers?.exactRequirements, labelForExactRequirement)}
          />
          <DetailRow
            label="Styles"
            value={joinLabeledValues(answers?.stylePreferences, labelForStyle)}
          />
          <DetailRow label="Mood" value={answers?.mood?.trim() ?? ''} />
          <DetailRow label="Colors include" value={answers?.includedColors?.trim() ?? ''} />
          <DetailRow label="Colors avoid" value={answers?.excludedColors?.trim() ?? ''} />
          <DetailRow label="Garment" value={answers?.garmentColor?.trim() ?? ''} />
          <DetailRow
            label="Composition"
            value={answers?.composition ? labelForComposition(answers.composition) : ''}
          />
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
  const [url, setUrl] = useState<string | null>(null);
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const [canPortal, setCanPortal] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const approvedDownload = useMemo(() => {
    if (request.status !== 'approved') {
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
  }, [proof.id, request]);

  useEffect(() => {
    setCanPortal(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (proof.fullSizePurgedAt != null || !proof.storagePath?.trim()) {
      setUrl(null);
      setImageUnavailable(true);
      return;
    }
    setImageUnavailable(false);
    void assistedCreationService
      .getDownloadUrl(proof.storagePath)
      .then((next) => {
        if (!cancelled) {
          setUrl(next);
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
  }, [proof.fullSizePurgedAt, proof.storagePath]);

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
          <h2 id="assisted-creation-proof-modal-title">Proof {proofNumber}</h2>
          {approvedDownload ? (
            <span className="assisted-creation-status-badge is-approved">Approved</span>
          ) : null}
        </header>
        <div className="modal-body assisted-creation-proof-modal-body">
          {url ? (
            <div className="assisted-creation-proof-stage">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`Proof ${proofNumber}`}
                className="assisted-creation-proof-stage-image"
                src={url}
              />
            </div>
          ) : (
            <p className="portal-muted">
              {imageUnavailable ? 'This proof file is no longer available.' : 'Loading proof…'}
            </p>
          )}
          <dl className="assisted-creation-proof-summary">
            {approvedDownload ? (
              <DetailRow label="Status" value="Approved proof" />
            ) : null}
            <DetailRow label="Sent" value={formatAssistedWhen(proof.createdAt)} />
          </dl>
          <div className="assisted-creation-proof-modal-actions">
            <ProofNoteActions
              proof={proof}
              proofNumber={proofNumber}
              proofs={request.proofs ?? []}
              revisionHistory={request.revisionHistory}
            />
          </div>
          {approvedDownload?.eligible && approvedDownload.proof?.storagePath ? (
            <p className="portal-muted assisted-creation-proof-download-hint">
              Download within 14 days of approval
              {approvedDownload.expiresAtMillis
                ? ` (available until ${formatAssistedWhen(approvedDownload.expiresAtMillis)})`
                : ''}
              . Preview grey is display-only; PNG keeps transparency.
            </p>
          ) : null}
          {approvedDownload &&
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
          {approvedDownload?.eligible && approvedDownload.proof?.storagePath ? (
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
                : isAssistedCreationProofPng(approvedDownload.proof.contentType)
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

function ProofListThumb({ proof }: { proof: AssistedCreationProof }) {
  const [url, setUrl] = useState<string | null>(null);
  const unavailable = proof.fullSizePurgedAt != null || !proof.storagePath?.trim();

  useEffect(() => {
    let cancelled = false;
    if (unavailable) {
      setUrl(null);
      return;
    }
    void assistedCreationService
      .getDownloadUrl(proof.storagePath)
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
  }, [proof.storagePath, unavailable]);

  if (unavailable || !url) {
    return (
      <span aria-hidden="true" className="assisted-creation-proof-row-placeholder" />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt="" className="assisted-creation-proof-row-thumb" src={url} />
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

  return (
    <div className="assisted-creation-detail-stack assisted-creation-detail-stack--dense">
      <section className="assisted-creation-detail-block">
        <h3 className="assisted-creation-detail-block-title">Proofs</h3>
        {proofsNewestFirst.length === 0 ? (
          <p className="portal-muted">No proofs yet.</p>
        ) : (
          <ul className="assisted-creation-proof-list">
            {proofsNewestFirst.map((proof, index) => {
              const proofNumber = chronologicalProofNumber(proofsAsc, proof.id);
              const isApprovedProof = Boolean(approvedProofId) && proof.id === approvedProofId;
              return (
                <li key={proof.id}>
                  <button
                    className="assisted-creation-proof-row"
                    onClick={() => setSelectedProofId(proof.id)}
                    type="button"
                  >
                    <ProofListThumb proof={proof} />
                    <span className="assisted-creation-proof-row-body">
                      <span className="assisted-creation-proof-row-title">
                        <span>
                          Proof {proofNumber}
                          {index === 0 ? ' (latest)' : ''}
                        </span>
                        {isApprovedProof ? (
                          <span className="assisted-creation-status-badge is-approved">
                            Approved
                          </span>
                        ) : null}
                      </span>
                      <span className="assisted-creation-proof-row-meta">
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
