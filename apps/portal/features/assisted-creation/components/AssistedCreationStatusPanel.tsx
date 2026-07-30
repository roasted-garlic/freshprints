'use client';

import { TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import {
  ASSISTED_CREATION_FIELD_LIMITS,
  canCustomerUpdateAssistedCreation,
  formatAssistedCreationStatus,
  isAssistedCreationOpenStatus,
  type AssistedCreationStatus,
} from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';
import type { AssistedCreationRequest } from '@fresh-prints/shared/types/assistedCreation/assistedCreation.types';
import { CatalogPreviewLightbox } from '../../catalog/components/CatalogPreviewLightbox';
import { catalogStorageService } from '../../catalog/services/catalogStorageService';
import { buildPortalDesignDeepLinkPath } from '../../catalog/utils/portalDesignShareUrls';
import { PortalConfirmModal } from '../../shared/components/PortalConfirmModal';
import { getPortalAuth } from '../../../lib/firebase/client';
import { assistedCreationService } from '../services/assistedCreationService';
import {
  assistedCreationStatusTone,
} from '../utils/assistedCreationDisplay';
import { parseAssistedCreationLocation } from '../utils/assistedCreationUrlState';
import { AssistedCreationActionsMenu } from './AssistedCreationActionsMenu';
import {
  AssistedCreationDetailTabs,
  ExpandableBlock,
  ProofNoteActions,
  type AssistedDetailTab,
} from './AssistedCreationDetailPanels';
import { AssistedCreationUpdateModal } from './AssistedCreationUpdateModal';

interface AssistedCreationStatusPanelProps {
  onStartNew?: () => void;
}

function statusMessage(
  status: AssistedCreationStatus,
  options?: { catalogShare?: boolean },
): string {
  const catalogShare = options?.catalogShare === true;
  switch (status) {
    case 'submitted':
      return 'Fresh Prints has your brief. You can still update details or add references until staff starts work.';
    case 'in_progress':
      return catalogShare
        ? 'Your design is being created. Additions are locked while staff works.'
        : 'Your design is being created. Additions are locked while staff works. We will send a proof here when it is ready.';
    case 'proof_ready':
      return catalogShare
        ? 'We found a Library design that matches your request. Approve it or request changes with a short note.'
        : 'Review the proof below. Approve it with an optional rating, or request changes with a short note.';
    case 'revision_requested':
      return catalogShare
        ? 'Your change notes were sent. Staff will update the suggestion or send a custom proof.'
        : 'Your revision notes were sent. Staff will update the design and send a new proof.';
    case 'final_source_needed':
      return 'Fresh Prints is preparing your final high-resolution artwork. We will let you know when it is ready to download.';
    case 'approved':
      return catalogShare
        ? 'This library design is approved. Add it to your Current Request from Overview, or start a new assisted request anytime.'
        : 'This design is approved. Download the final artwork below while it is still available, or start a new assisted request anytime.';
    case 'rejected':
      return 'This request was not approved. You can start a new assisted request anytime.';
    case 'cancelled':
      return 'This request was cancelled. You can start a new assisted request anytime.';
    default:
      return '';
  }
}

export function AssistedCreationStatusPanel({ onStartNew }: AssistedCreationStatusPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [requests, setRequests] = useState<AssistedCreationRequest[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  /** Which proof response is in flight — drives Sending… / Approving… labels. */
  const [pendingProofAction, setPendingProofAction] = useState<'revision' | 'approve' | null>(
    null,
  );
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  /** idle | loading | ready | unavailable — never leave UI on eternal “Loading…”. */
  const [proofImageState, setProofImageState] = useState<
    'idle' | 'loading' | 'ready' | 'unavailable'
  >('idle');
  const [proofLightboxOpen, setProofLightboxOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [updateOpen, setUpdateOpen] = useState(false);
  const initialDetailTab = parseAssistedCreationLocation(pathname, searchParams).detailTab;
  const [activeTab, setActiveTab] = useState<AssistedDetailTab>(initialDetailTab);

  useEffect(() => {
    setActiveTab(parseAssistedCreationLocation(pathname, searchParams).detailTab);
  }, [pathname, searchParams]);

  useEffect(() => {
    const uid = getPortalAuth().currentUser?.uid;
    if (!uid) {
      setLoadError('Sign in to view your assisted creation requests.');
      return;
    }
    return assistedCreationService.subscribeRecentRequestsForCustomer(
      uid,
      setRequests,
      (error) => setLoadError(error.message),
    );
  }, []);

  const openRequest = useMemo(
    () => requests.find((item) => isAssistedCreationOpenStatus(item.status)) ?? null,
    [requests],
  );
  const latest = openRequest ?? requests[0] ?? null;

  useEffect(() => {
    let cancelled = false;
    async function loadProof() {
      if (
        !latest ||
        (latest.status !== 'proof_ready' && latest.status !== 'final_source_needed')
      ) {
        setProofImageState('idle');
        setProofUrl((previous) => {
          if (previous?.startsWith('blob:')) {
            URL.revokeObjectURL(previous);
          }
          return null;
        });
        return;
      }
      if (latest.fulfillmentMode === 'catalog_share' && latest.status === 'proof_ready') {
        const previewPath = latest.suggestedCatalogDesign?.previewImageUrl?.trim();
        if (!previewPath) {
          setProofUrl(null);
          setProofImageState('unavailable');
          return;
        }
        setProofImageState('loading');
        try {
          const url = await catalogStorageService.getDownloadUrlForCatalogPath(previewPath);
          if (!cancelled) {
            if (url) {
              setProofUrl(url);
              setProofImageState('ready');
            } else {
              setProofUrl(null);
              setProofImageState('unavailable');
            }
          }
        } catch {
          if (!cancelled) {
            setProofUrl(null);
            setProofImageState('unavailable');
          }
        }
        return;
      }
      const approvedId = latest.approvedProofId?.trim();
      const proof =
        latest.status === 'final_source_needed' && approvedId
          ? latest.proofs.find((entry) => entry.id === approvedId) ?? null
          : latest.proofs.length > 0
            ? latest.proofs[latest.proofs.length - 1]
            : null;
      if (!proof?.storagePath?.trim() || proof.fullSizePurgedAt != null) {
        setProofUrl(null);
        setProofImageState('unavailable');
        return;
      }
      setProofImageState('loading');
      try {
        const url = await assistedCreationService.getPreviewObjectUrl(
          proof.storagePath,
          proof.contentType,
        );
        if (!cancelled) {
          setProofUrl((previous) => {
            if (previous?.startsWith('blob:')) {
              URL.revokeObjectURL(previous);
            }
            return url;
          });
          setProofImageState('ready');
        } else if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      } catch {
        if (!cancelled) {
          setProofUrl((previous) => {
            if (previous?.startsWith('blob:')) {
              URL.revokeObjectURL(previous);
            }
            return null;
          });
          setProofImageState('unavailable');
        }
      }
    }
    void loadProof();
    return () => {
      cancelled = true;
    };
  }, [latest]);

  if (loadError) {
    return (
      <section className="etsy-wizard-shell assisted-creation-status">
        <p className="portal-form-error">{loadError}</p>
      </section>
    );
  }

  if (!latest) {
    return (
      <section className="etsy-wizard-shell assisted-creation-status">
        <header className="assisted-creation-status-header">
          <p className="etsy-wizard-step-label">Assisted Creation</p>
          <h1 className="etsy-wizard-heading">No open request</h1>
          <p className="portal-muted assisted-creation-status-lead">
            You do not have an assisted creation request yet.
          </p>
        </header>
        <div className="etsy-wizard-actions assisted-creation-status-footer">
          <button
            className="portal-button portal-button-secondary"
            onClick={() => router.push('/custom-designs')}
            type="button"
          >
            Back
          </button>
          {onStartNew ? (
            <button className="portal-button portal-button-primary" onClick={onStartNew} type="button">
              Start assisted request
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  const canCancel = isAssistedCreationOpenStatus(latest.status);
  const canUpdate = canCustomerUpdateAssistedCreation(latest.status);
  const canRespond = latest.status === 'proof_ready';
  const isCatalogShare =
    latest.fulfillmentMode === 'catalog_share' &&
    Boolean(latest.suggestedCatalogDesign?.designId);
  const catalogShareForLead =
    isCatalogShare ||
    (latest.status === 'approved' && Boolean(latest.approvedCatalogDesignId));
  const statusLead = statusMessage(latest.status, { catalogShare: catalogShareForLead });
  const showCatalogShareReviewCallout =
    latest.status === 'proof_ready' && catalogShareForLead;
  const latestProof =
    !isCatalogShare && latest.proofs.length > 0
      ? latest.proofs[latest.proofs.length - 1]
      : null;
  const suggestedDesign = latest.suggestedCatalogDesign;
  const libraryDeepLink = suggestedDesign?.designId
    ? buildPortalDesignDeepLinkPath(suggestedDesign.designId)
    : null;

  return (
    <section className="etsy-wizard-shell assisted-creation-status">
      <header className="assisted-creation-status-header">
        <div className="assisted-creation-status-title-row">
          <p className="etsy-wizard-step-label">Assisted Creation</p>
          <div className="assisted-creation-status-header-actions">
            <span
              className={`assisted-creation-status-badge ${assistedCreationStatusTone(latest.status)}`}
            >
              {latest.status === 'final_source_needed'
                ? 'Proof approved'
                : formatAssistedCreationStatus(latest.status)}
            </span>
            <AssistedCreationActionsMenu
              canCancel={canCancel}
              canUpdate={canUpdate}
              disabled={busy}
              onCancel={() => {
                setCancelReason('');
                setCancelConfirmOpen(true);
              }}
              onUpdate={() => {
                setActionError(null);
                setUpdateOpen(true);
              }}
            />
          </div>
        </div>
        <h1 className="etsy-wizard-heading">Request status</h1>
        {showCatalogShareReviewCallout ? (
          <p
            className="etsy-questionnaire-warning assisted-creation-status-lead"
            role="note"
          >
            <TriangleAlert
              aria-hidden
              className="etsy-questionnaire-warning-icon"
              size={16}
              strokeWidth={2}
            />
            <span>{statusLead}</span>
          </p>
        ) : (
          <p className="portal-muted assisted-creation-status-lead">{statusLead}</p>
        )}
      </header>

      {canRespond ? (
        <div className="assisted-creation-proof-panel">
          <h2 className="assisted-creation-proof-heading">
            {isCatalogShare ? 'Library design ready for review' : 'Your proof is ready'}
          </h2>
          {isCatalogShare && suggestedDesign ? (
            <div className="assisted-creation-catalog-suggestion-card">
              <p className="assisted-creation-catalog-suggestion-title">{suggestedDesign.title}</p>
              {proofUrl ? (
                <button
                  aria-label={`Open preview of ${suggestedDesign.title}`}
                  className="assisted-creation-proof-image-button assisted-creation-proof-stage"
                  onClick={() => setProofLightboxOpen(true)}
                  type="button"
                >
                  <img
                    alt={suggestedDesign.title}
                    className="assisted-creation-proof-stage-image"
                    draggable={false}
                    src={proofUrl}
                  />
                </button>
              ) : (
                <p className="portal-muted">
                  {proofImageState === 'unavailable'
                    ? 'Preview unavailable.'
                    : 'Loading design preview…'}
                </p>
              )}
              {libraryDeepLink ? (
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
            </div>
          ) : proofUrl ? (
            <button
              aria-label="Open proof preview"
              className="assisted-creation-proof-image-button assisted-creation-proof-stage"
              onClick={() => setProofLightboxOpen(true)}
              type="button"
            >
              <img
                alt="Design proof"
                className="assisted-creation-proof-stage-image"
                draggable={false}
                src={proofUrl}
              />
            </button>
          ) : (
            <p className="portal-muted">
              {proofImageState === 'unavailable'
                ? 'Preview unavailable.'
                : 'Loading proof image…'}
            </p>
          )}

          {latestProof ? (
            <ProofNoteActions
              proof={latestProof}
              proofNumber={latest.proofs.length}
              proofs={latest.proofs}
              revisionHistory={latest.revisionHistory}
            />
          ) : null}

          <section
            aria-labelledby="assisted-creation-respond-heading"
            className="assisted-creation-proof-response"
          >
            <h3
              className="assisted-creation-proof-response-heading"
              id="assisted-creation-respond-heading"
            >
              {isCatalogShare ? 'Respond to library design' : 'Respond to proof'}
            </h3>

            <ExpandableBlock title="Request revisions">
              <div className="assisted-creation-proof-response-fields">
                <label className="portal-field">
                  <span>What should we change?</span>
                  <textarea
                    disabled={busy}
                    maxLength={ASSISTED_CREATION_FIELD_LIMITS.revisionNote}
                    onChange={(event) => setRevisionNote(event.target.value)}
                    placeholder="Describe the changes you need"
                    rows={3}
                    value={revisionNote}
                  />
                </label>
                <button
                  aria-busy={pendingProofAction === 'revision' || undefined}
                  className="portal-button assisted-creation-revision-button"
                  disabled={busy || !revisionNote.trim()}
                  onClick={() => {
                    if (busy || !revisionNote.trim()) {
                      return;
                    }
                    setBusy(true);
                    setPendingProofAction('revision');
                    setActionError(null);
                    void assistedCreationService
                      .respondToProof({
                        requestId: latest.id,
                        decision: 'request_revision',
                        note: revisionNote,
                      })
                      .then(() => setRevisionNote(''))
                      .catch((error: unknown) => {
                        setActionError(
                          error instanceof Error ? error.message : 'Unable to request revision.',
                        );
                      })
                      .finally(() => {
                        setPendingProofAction(null);
                        setBusy(false);
                      });
                  }}
                  type="button"
                >
                  {pendingProofAction === 'revision' ? 'Sending…' : 'Send revision notes'}
                </button>
                {pendingProofAction === 'revision' ? (
                  <p aria-live="polite" className="portal-muted">
                    Sending your revision notes…
                  </p>
                ) : null}
              </div>
            </ExpandableBlock>

            <ExpandableBlock title="Approve">
              <div className="assisted-creation-proof-response-fields">
                <fieldset className="assisted-creation-rating-fieldset" disabled={busy}>
                  <legend>Rate this design (optional)</legend>
                  <div className="assisted-creation-rating-row">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        aria-pressed={rating === value}
                        className={`assisted-creation-rating-star${rating != null && rating >= value ? ' is-selected' : ''}`}
                        disabled={busy}
                        key={value}
                        onClick={() => setRating((current) => (current === value ? null : value))}
                        type="button"
                      >
                        {value}★
                      </button>
                    ))}
                  </div>
                </fieldset>

                <label className="portal-field">
                  <span>Approval note (optional)</span>
                  <textarea
                    disabled={busy}
                    maxLength={ASSISTED_CREATION_FIELD_LIMITS.approvalNote}
                    onChange={(event) => setApprovalNote(event.target.value)}
                    placeholder="Anything you loved, or a quick thank-you"
                    rows={2}
                    value={approvalNote}
                  />
                </label>

                <div className="etsy-wizard-actions assisted-creation-proof-actions">
                  <button
                    aria-busy={pendingProofAction === 'approve' || undefined}
                    className="portal-button assisted-creation-approve-button"
                    disabled={busy}
                    onClick={() => {
                      if (busy) {
                        return;
                      }
                      setBusy(true);
                      setPendingProofAction('approve');
                      setActionError(null);
                      void assistedCreationService
                        .respondToProof({
                          requestId: latest.id,
                          decision: 'approve',
                          note: approvalNote.trim() || undefined,
                          rating: rating ?? undefined,
                        })
                        .then(() => {
                          setApprovalNote('');
                          setRating(null);
                        })
                        .catch((error: unknown) => {
                          setActionError(
                            error instanceof Error ? error.message : 'Unable to approve.',
                          );
                        })
                        .finally(() => {
                          setPendingProofAction(null);
                          setBusy(false);
                        });
                    }}
                    type="button"
                  >
                    {pendingProofAction === 'approve' ? 'Approving…' : 'Approve & send'}
                  </button>
                </div>
                {pendingProofAction === 'approve' ? (
                  <p aria-live="polite" className="portal-muted">
                    Sending your approval…
                  </p>
                ) : null}
              </div>
            </ExpandableBlock>
          </section>
        </div>
      ) : null}

      {latest.status === 'final_source_needed' ? (
        <div className="assisted-creation-proof-panel">
          <h2 className="assisted-creation-proof-heading">Proof approved</h2>
          <p className="portal-muted">
            Fresh Prints is preparing your final high-resolution artwork. We will let you know when
            it is ready to download.
          </p>
          {proofUrl ? (
            <button
              aria-label="Open approved proof preview"
              className="assisted-creation-proof-image-button assisted-creation-proof-stage"
              onClick={() => setProofLightboxOpen(true)}
              type="button"
            >
              <img
                alt="Approved proof"
                className="assisted-creation-proof-stage-image"
                draggable={false}
                src={proofUrl}
              />
            </button>
          ) : (
            <p className="portal-muted">
              {proofImageState === 'unavailable'
                ? 'Preview unavailable.'
                : 'Loading approved proof…'}
            </p>
          )}
        </div>
      ) : null}

      <AssistedCreationDetailTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        request={latest}
      />

      {actionError && !updateOpen ? <p className="portal-form-error">{actionError}</p> : null}

      <div className="etsy-wizard-actions assisted-creation-status-footer">
        <button
          className="portal-button portal-button-secondary"
          onClick={() => router.push('/custom-designs')}
          type="button"
        >
          Back
        </button>
        {!openRequest && onStartNew ? (
          <button className="portal-button portal-button-primary" onClick={onStartNew} type="button">
            Start new request
          </button>
        ) : null}
      </div>

      <AssistedCreationUpdateModal
        busy={busy}
        isOpen={updateOpen}
        onBusyChange={setBusy}
        onClose={() => {
          setUpdateOpen(false);
          setActionError(null);
        }}
        onError={setActionError}
        request={latest}
      />

      <PortalConfirmModal
        cancelLabel="Keep request"
        className="assisted-creation-confirm-overlay"
        confirmDisabled={cancelReason.trim().length === 0}
        confirmLabel="Yes, cancel request"
        confirmVariant="danger"
        isConfirmLoading={busy}
        isOpen={cancelConfirmOpen}
        onCancel={() => {
          setCancelConfirmOpen(false);
          setCancelReason('');
        }}
        onConfirm={() => {
          const reason = cancelReason.trim();
          if (!reason) {
            return;
          }
          setBusy(true);
          setActionError(null);
          void assistedCreationService
            .cancelRequest(latest.id, reason)
            .then(() => {
              setCancelConfirmOpen(false);
              setCancelReason('');
            })
            .catch((error: unknown) => {
              setActionError(error instanceof Error ? error.message : 'Unable to cancel.');
            })
            .finally(() => setBusy(false));
        }}
        title="Cancel this request?"
      >
        <p>
          Canceling closes this assisted creation request. You will need to start a new request if
          you still want a custom design.
        </p>
        <label className="portal-field">
          <span>Why are you canceling? (required)</span>
          <textarea
            maxLength={ASSISTED_CREATION_FIELD_LIMITS.revisionNote}
            onChange={(event) => setCancelReason(event.target.value)}
            placeholder="Briefly tell us why"
            rows={3}
            value={cancelReason}
          />
        </label>
      </PortalConfirmModal>

      <CatalogPreviewLightbox
        alt={
          isCatalogShare && suggestedDesign
            ? suggestedDesign.title
            : 'Design proof'
        }
        className="assisted-creation-lightbox"
        isOpen={proofLightboxOpen && proofUrl != null}
        onClose={() => setProofLightboxOpen(false)}
        previewUrl={proofUrl}
      />
    </section>
  );
}
