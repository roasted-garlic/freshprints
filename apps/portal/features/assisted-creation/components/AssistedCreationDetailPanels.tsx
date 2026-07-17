'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import type {
  AssistedCreationProof,
  AssistedCreationRequest,
} from '@fresh-prints/shared/types/assistedCreation/assistedCreation.types';

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
import { buildAssistedHistoryEntries, formatAssistedWhen } from '../utils/assistedCreationDisplay';
import { assistedCreationService } from '../services/assistedCreationService';
import { AssistedCreationMediaThumbs } from './AssistedCreationMediaThumbs';

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

/** Staff note attached to a proof — shown with the proof, not only in History. */
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

export function AssistedCreationBriefAndDetails({ request }: { request: AssistedCreationRequest }) {
  const answers = request.answers;
  const description = answers?.rawDescription?.trim() || 'No description';

  return (
    <div className="assisted-creation-detail-stack assisted-creation-detail-stack--dense">
      <ExpandableBlock defaultOpen title="Brief">
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
}: {
  onClose: () => void;
  proof: AssistedCreationProof;
  proofNumber: number;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [canPortal, setCanPortal] = useState(false);

  useEffect(() => {
    setCanPortal(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
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
  }, [proof.storagePath]);

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
        <header className="modal-header">
          <h2>Proof {proofNumber}</h2>
        </header>
        <div className="modal-body">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={proof.fileName || `Proof ${proofNumber}`}
              className="assisted-creation-proof-modal-image"
              src={url}
            />
          ) : (
            <p className="portal-muted">Loading proof…</p>
          )}
          <StaffProofNote note={proof.note} />
          <dl className="assisted-creation-detail-rows">
            <DetailRow label="File" value={proof.fileName || ''} />
            <DetailRow label="Sent" value={formatAssistedWhen(proof.createdAt)} />
          </dl>
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

export function AssistedCreationProofsPanel({ request }: { request: AssistedCreationRequest }) {
  const proofs = request.proofs ?? [];
  const [selectedProofId, setSelectedProofId] = useState<string | null>(null);
  const selectedProof = useMemo(
    () => proofs.find((proof) => proof.id === selectedProofId) ?? null,
    [proofs, selectedProofId],
  );
  const selectedProofNumber =
    selectedProof == null ? 0 : proofs.findIndex((proof) => proof.id === selectedProof.id) + 1;

  return (
    <div className="assisted-creation-detail-stack assisted-creation-detail-stack--dense">
      <section className="assisted-creation-detail-block">
        <h3 className="assisted-creation-detail-block-title">Proofs</h3>
        {proofs.length === 0 ? (
          <p className="portal-muted">No proofs yet.</p>
        ) : (
          <ul className="assisted-creation-proof-list">
            {proofs.map((proof, index) => (
              <li key={proof.id}>
                <button
                  className="assisted-creation-proof-row"
                  onClick={() => setSelectedProofId(proof.id)}
                  type="button"
                >
                  <span className="assisted-creation-proof-row-title">
                    Proof {index + 1}
                    {index === proofs.length - 1 ? ' (latest)' : ''}
                  </span>
                  <span className="assisted-creation-proof-row-meta">
                    {formatAssistedWhen(proof.createdAt) || 'Sent'}
                    {proof.note?.trim() ? ' · Has note' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedProof ? (
        <ProofDetailModal
          onClose={() => setSelectedProofId(null)}
          proof={selectedProof}
          proofNumber={selectedProofNumber}
        />
      ) : null}
    </div>
  );
}

export function AssistedCreationHistoryPanel({ request }: { request: AssistedCreationRequest }) {
  const history = buildAssistedHistoryEntries(request.revisionHistory);

  return (
    <div className="assisted-creation-detail-stack assisted-creation-detail-stack--dense">
      <section className="assisted-creation-detail-block">
        <h3 className="assisted-creation-detail-block-title">History</h3>
        {history.length === 0 ? (
          <p className="portal-muted">No history yet.</p>
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
      </section>
    </div>
  );
}

type AssistedDetailTab = 'overview' | 'proofs' | 'history';

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
          aria-selected={activeTab === 'history'}
          className={`assisted-creation-tab-button${activeTab === 'history' ? ' is-active' : ''}`}
          onClick={() => onTabChange('history')}
          role="tab"
          type="button"
        >
          History
        </button>
      </div>
      <div className="assisted-creation-tab-panel" role="tabpanel">
        {activeTab === 'overview' ? (
          <AssistedCreationBriefAndDetails request={request} />
        ) : activeTab === 'proofs' ? (
          <AssistedCreationProofsPanel request={request} />
        ) : (
          <AssistedCreationHistoryPanel request={request} />
        )}
      </div>
    </div>
  );
}

export type { AssistedDetailTab };
