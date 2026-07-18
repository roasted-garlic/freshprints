'use client';

import { useEffect, useState } from 'react';

import {
  ASSISTED_CREATION_FIELD_LIMITS,
  canCustomerUpdateAssistedCreation,
  filterAssistedCreationTerminalRequests,
  formatAssistedCreationStatus,
  isAssistedCreationOpenStatus,
} from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';
import type { AssistedCreationRequest } from '@fresh-prints/shared/types/assistedCreation/assistedCreation.types';

import { PortalConfirmModal } from '../../shared/components/PortalConfirmModal';
import { getPortalAuth } from '../../../lib/firebase/client';
import { assistedCreationService } from '../services/assistedCreationService';
import {
  assistedCreationStatusTone,
  formatAssistedWhen,
} from '../utils/assistedCreationDisplay';
import { AssistedCreationActionsMenu } from './AssistedCreationActionsMenu';
import {
  AssistedCreationDetailTabs,
  type AssistedDetailTab,
} from './AssistedCreationDetailPanels';
import { AssistedCreationUpdateModal } from './AssistedCreationUpdateModal';

interface AssistedCreationPastRequestsProps {
  className?: string;
}

export function AssistedCreationPastRequests({ className }: AssistedCreationPastRequestsProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<AssistedCreationRequest | null>(null);
  const [requests, setRequests] = useState<AssistedCreationRequest[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AssistedDetailTab>('overview');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [updateOpen, setUpdateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const terminalRequests = filterAssistedCreationTerminalRequests(requests);

  useEffect(() => {
    const uid = getPortalAuth().currentUser?.uid;
    if (!uid) {
      setRequests([]);
      return;
    }
    return assistedCreationService.subscribeRecentRequestsForCustomer(
      uid,
      (items) => {
        const terminalItems = filterAssistedCreationTerminalRequests(items);
        setRequests(items);
        setLoadError(null);
        setSelected((current) => {
          if (!current) {
            return null;
          }
          return terminalItems.find((item) => item.id === current.id) ?? null;
        });
      },
      (error) => setLoadError(error.message),
    );
  }, []);

  useEffect(() => {
    if (!drawerOpen && !selected) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (cancelConfirmOpen || updateOpen) {
          return;
        }
        if (selected) {
          setUpdateOpen(false);
          setSelected(null);
        } else {
          setDrawerOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cancelConfirmOpen, drawerOpen, selected, updateOpen]);

  const count = terminalRequests.length;
  if (count === 0) {
    return null;
  }

  const linkLabel = `Past Requests (${count})`;
  const canCancel = selected != null && isAssistedCreationOpenStatus(selected.status);
  const canUpdate = selected != null && canCustomerUpdateAssistedCreation(selected.status);

  return (
    <div className={className}>
      <button
        className="assisted-creation-past-link"
        onClick={() => setDrawerOpen(true)}
        type="button"
      >
        {linkLabel}
      </button>

      {drawerOpen ? (
        <div
          aria-modal={selected ? undefined : true}
          className="assisted-creation-drawer-overlay"
          onClick={() => {
            if (selected) {
              return;
            }
            setDrawerOpen(false);
          }}
          role="dialog"
        >
          <aside
            aria-label="Past Requests"
            className="assisted-creation-drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="assisted-creation-drawer-header">
              <h2>Past Requests ({count})</h2>
              <button
                className="portal-button portal-button-secondary"
                onClick={() => {
                  setUpdateOpen(false);
                  setSelected(null);
                  setDrawerOpen(false);
                }}
                type="button"
              >
                Close
              </button>
            </header>

            {loadError ? <p className="portal-form-error">{loadError}</p> : null}

            <ul className="assisted-creation-drawer-list">
              {terminalRequests.map((request) => (
                <li key={request.id}>
                  <button
                    className="assisted-creation-drawer-item"
                    onClick={() => {
                      setActiveTab('overview');
                      setActionError(null);
                      setSelected(request);
                    }}
                    type="button"
                  >
                    <span className="assisted-creation-drawer-item-top">
                      <strong>
                        {formatAssistedCreationStatus(request.status, { variant: 'list' })}
                      </strong>
                      <span className="portal-muted">
                        {formatAssistedWhen(request.createdAt) || 'Unknown date'}
                      </span>
                    </span>
                    <span>
                      {(request.answers?.rawDescription || 'No description').slice(0, 100)}
                      {(request.answers?.rawDescription?.length ?? 0) > 100 ? '…' : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      ) : null}

      {selected ? (
        <div
          aria-labelledby="assisted-creation-history-modal-title"
          aria-modal="true"
          className="modal-overlay modal-overlay-blur assisted-creation-history-modal-overlay"
          onClick={() => {
            if (!cancelConfirmOpen && !updateOpen) {
              setSelected(null);
            }
          }}
          role="dialog"
        >
          <div
            className="modal-panel assisted-creation-history-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-header assisted-creation-history-modal-header">
              <div className="assisted-creation-history-modal-heading">
                <h2 id="assisted-creation-history-modal-title">Assisted request</h2>
                <div className="assisted-creation-status-header-actions">
                  <span
                    className={`assisted-creation-status-badge ${assistedCreationStatusTone(selected.status)}`}
                  >
                    {formatAssistedCreationStatus(selected.status)}
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
              <p className="portal-muted assisted-creation-history-modal-meta">
                Submitted {formatAssistedWhen(selected.createdAt) || '—'}
              </p>
            </header>
            <div className="modal-body assisted-creation-history-modal-body">
              <AssistedCreationDetailTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                request={selected}
                tabListLabel="Past request sections"
              />
              {actionError && !updateOpen ? <p className="portal-form-error">{actionError}</p> : null}
            </div>
            <footer className="modal-footer assisted-creation-history-modal-footer">
              <button
                className="portal-button portal-button-secondary"
                onClick={() => setSelected(null)}
                type="button"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {selected ? (
        <AssistedCreationUpdateModal
          busy={busy}
          isOpen={updateOpen}
          onBusyChange={setBusy}
          onClose={() => {
            setUpdateOpen(false);
            setActionError(null);
          }}
          onError={setActionError}
          request={selected}
        />
      ) : null}

      <PortalConfirmModal
        cancelLabel="Keep request"
        className="assisted-creation-confirm-overlay"
        confirmDisabled={cancelReason.trim().length === 0}
        confirmLabel="Yes, cancel request"
        confirmVariant="danger"
        isConfirmLoading={busy}
        isOpen={cancelConfirmOpen && selected != null}
        onCancel={() => {
          setCancelConfirmOpen(false);
          setCancelReason('');
        }}
        onConfirm={() => {
          if (!selected) {
            return;
          }
          const reason = cancelReason.trim();
          if (!reason) {
            return;
          }
          setBusy(true);
          setActionError(null);
          void assistedCreationService
            .cancelRequest(selected.id, reason)
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
    </div>
  );
}
