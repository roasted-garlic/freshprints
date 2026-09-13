'use client';

import { useEffect, useMemo, useState } from 'react';

import type { PortalAdminShowCapacityDto } from '@fresh-prints/shared/types/portal/getPortalAdminUpcomingShowQueueDashboard.types';

import { PortalAdminShowPickerModal } from '../components/PortalAdminShowPickerModal';
import { PortalAdminViewDesignsModal } from '../components/PortalAdminViewDesignsModal';
import { usePortalAdminShowQueue } from '../hooks/usePortalAdminShowQueue';

function formatDateTime(scheduledStartAtMs: number | null, timeZone: string): string {
  if (scheduledStartAtMs === null) {
    return 'Schedule TBD';
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(scheduledStartAtMs));
}

function formatPercent(capacity: PortalAdminShowCapacityDto): string | null {
  if (capacity.percentUsed === undefined) {
    return null;
  }
  return `${Math.round(capacity.percentUsed)}% Full`;
}

function kindLabel(kind: 'customer' | 'internal' | 'unknown'): string {
  if (kind === 'customer') return 'Customer';
  if (kind === 'internal') return 'Internal';
  return 'Unknown';
}

function requestOwnerLabel(request: {
  kind: 'customer' | 'internal' | 'unknown';
  customerIdentityLabel?: string;
}): string {
  if (request.customerIdentityLabel?.trim()) {
    return request.customerIdentityLabel.trim();
  }
  return kindLabel(request.kind);
}

export function PortalAdminShowQueuePage() {
  const { data, error, isLoading, selectedShowId, refresh, selectShow } = usePortalAdminShowQueue();
  const [modal, setModal] = useState<{ printRequestId: string; requestName: string } | null>(null);

  useEffect(() => {
    setModal(null);
  }, [selectedShowId]);

  const selected = data?.selected ?? null;
  const capacityBarWidth = useMemo(() => {
    if (!selected?.capacity.percentUsed) {
      return 0;
    }
    return Math.min(100, Math.max(0, selected.capacity.percentUsed));
  }, [selected]);

  const percentLabel = selected ? formatPercent(selected.capacity) : null;

  return (
    <div className="portal-admin-dashboard">
      <section aria-labelledby="portal-admin-queue-title" className="portal-admin-queue">
        <div className="portal-admin-queue-heading">
          <div>
            <h2 id="portal-admin-queue-title">{selected?.title ?? 'Show Queue'}</h2>
            {selected ? (
              <p className="portal-admin-day">
                {formatDateTime(selected.scheduledStartAtMs, data?.timeZone ?? 'America/Chicago')}
              </p>
            ) : null}
          </div>
          <button
            className="portal-button portal-button-primary"
            disabled={isLoading}
            onClick={() => void refresh()}
            type="button"
          >
            {isLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {isLoading && !data ? (
          <div aria-live="polite" className="portal-admin-loading">
            Loading upcoming Show Queue…
          </div>
        ) : null}
        {error ? (
          <div className="portal-admin-error" role="alert">
            <p>{error}</p>
            <button className="portal-button portal-button-secondary" onClick={() => void refresh()} type="button">
              Try again
            </button>
          </div>
        ) : null}

        {data && !selected ? (
          <p className="portal-admin-empty">No upcoming Show Queue shows right now.</p>
        ) : null}

        {selected ? (
          <>
            <div className="portal-admin-summary" aria-label="Show totals">
              <div>
                <span>Designs</span>
                <strong>{selected.designQty}</strong>
              </div>
              <div>
                <span>Prints</span>
                <strong>{selected.printQty}</strong>
              </div>
              <div>
                <span>Print Requests</span>
                <strong>{selected.prQty}</strong>
              </div>
            </div>

            <div className="portal-admin-capacity" aria-label="Show capacity">
              <div className="portal-admin-capacity-track">
                <div
                  className={`portal-admin-capacity-fill${selected.capacity.isOverCapacity ? ' is-over' : ''}`}
                  style={{ width: `${capacityBarWidth}%` }}
                />
              </div>
              <div className="portal-admin-capacity-meta">
                <span>{selected.capacity.usedLabel}</span>
                <strong>
                  {percentLabel ?? (selected.capacity.maxTotalQuantity === undefined ? 'No max set' : '—')}
                </strong>
              </div>
            </div>

            {selected.requests.length === 0 ? (
              <p className="portal-admin-empty">No active Print Requests attached to this show.</p>
            ) : (
              <div className="portal-admin-request-list">
                {selected.requests.map((request) => (
                  <article className="portal-admin-request-card" key={request.printRequestId}>
                    <header>
                      <div>
                        <h3>{request.name}</h3>
                        <p>{requestOwnerLabel(request)}</p>
                      </div>
                      <button
                        className="portal-button portal-button-secondary"
                        onClick={() =>
                          setModal({
                            printRequestId: request.printRequestId,
                            requestName: request.name,
                          })
                        }
                        type="button"
                      >
                        View Designs
                      </button>
                    </header>
                    <div className="portal-admin-request-stats" aria-label="Request totals">
                      <span className="portal-admin-stat-pill">
                        Designs <strong>{request.designQty}</strong>
                      </span>
                      <span className="portal-admin-stat-pill">
                        Prints <strong>{request.printQty}</strong>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : null}
      </section>

      <PortalAdminShowPickerModal
        onSelectShow={(showId) => void selectShow(showId)}
        selectedShowId={selectedShowId}
        shows={data?.shows ?? []}
        timeZone={data?.timeZone ?? 'America/Chicago'}
      />

      {modal && selectedShowId ? (
        <PortalAdminViewDesignsModal
          onClose={() => setModal(null)}
          printRequestId={modal.printRequestId}
          requestName={modal.requestName}
          showId={selectedShowId}
        />
      ) : null}
    </div>
  );
}
