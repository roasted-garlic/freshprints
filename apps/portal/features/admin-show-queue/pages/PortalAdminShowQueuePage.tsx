'use client';

import { useEffect, useMemo, useState } from 'react';

import type { PortalAdminShowCapacityDto } from '@fresh-prints/shared/types/portal/getPortalAdminUpcomingShowQueueDashboard.types';

import { PortalAdminShowPickerModal } from '../components/PortalAdminShowPickerModal';
import { PortalAdminViewDesignsModal } from '../components/PortalAdminViewDesignsModal';
import { usePortalAdminShowQueue } from '../hooks/usePortalAdminShowQueue';
import {
  filterPortalAdminShowQueueRequests,
  groupPortalAdminShowQueueRequests,
  sumPortalAdminShowAllocationTotalPriceUsd,
} from '../utils/portalAdminShowQueueSearch';

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

function formatUsd(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) {
    return 'Unpriced';
  }
  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(amount);
}

function formatGroupPrice(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

function formatRequestCountLabel(count: number): string {
  return `${count} request${count === 1 ? '' : 's'}`;
}

function formatTotalQuantityLabel(quantity: number): string {
  return `${quantity} total qty`;
}

export function PortalAdminShowQueuePage() {
  const { data, error, isLoading, selectedShowId, refresh, selectShow } = usePortalAdminShowQueue();
  const [modal, setModal] = useState<{ printRequestId: string; requestName: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    setModal(null);
    setSearchQuery('');
    setExpandedGroupKeys(new Set());
  }, [selectedShowId]);

  useEffect(() => {
    setExpandedGroupKeys(new Set());
  }, [searchQuery]);

  const selected = data?.selected ?? null;
  const capacityBarWidth = useMemo(() => {
    if (!selected?.capacity.percentUsed) {
      return 0;
    }
    return Math.min(100, Math.max(0, selected.capacity.percentUsed));
  }, [selected]);

  const percentLabel = selected ? formatPercent(selected.capacity) : null;
  const filteredRequests = useMemo(
    () => filterPortalAdminShowQueueRequests(selected?.requests ?? [], searchQuery),
    [searchQuery, selected?.requests],
  );
  const requestGroups = useMemo(
    () => groupPortalAdminShowQueueRequests(filteredRequests),
    [filteredRequests],
  );
  const showTotalPriceUsd = useMemo(
    () => sumPortalAdminShowAllocationTotalPriceUsd(selected?.requests ?? []),
    [selected?.requests],
  );

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
              <div>
                <span>Show total</span>
                <strong>{formatUsd(showTotalPriceUsd)}</strong>
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
              <>
                <div aria-label="Search Print Requests" className="portal-admin-request-search" role="search">
                  <label htmlFor="portal-admin-request-search-input">Search Print Requests</label>
                  <input
                    aria-describedby="portal-admin-request-search-results"
                    id="portal-admin-request-search-input"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onInput={(event) => setSearchQuery(event.currentTarget.value)}
                    placeholder="Request title or customer"
                    type="search"
                    value={searchQuery}
                  />
                  <p aria-live="polite" id="portal-admin-request-search-results">
                    {searchQuery.trim()
                      ? `${filteredRequests.length} of ${selected.requests.length} requests shown`
                      : `${selected.requests.length} requests`}
                  </p>
                </div>
                {requestGroups.length === 0 ? (
                  <p className="portal-admin-empty">No Print Requests match this search.</p>
                ) : (
                  <div className="portal-admin-request-groups">
                    {requestGroups.map((group) => {
                      const groupKey =
                        group.customerGroupKey || group.requests[0]?.printRequestId || group.label;
                      const safeId = groupKey.replace(/[^a-zA-Z0-9_-]/g, '-');
                      const headingId = `portal-admin-request-group-${safeId}`;
                      const panelId = `portal-admin-request-group-panel-${safeId}`;
                      const isExpanded = expandedGroupKeys.has(groupKey);
                      return (
                        <section
                          aria-labelledby={headingId}
                          className={`portal-admin-request-group${isExpanded ? ' is-expanded' : ''}`}
                          key={groupKey}
                        >
                          <h3 className="portal-admin-request-group-heading" id={headingId}>
                            <button
                              aria-controls={panelId}
                              aria-expanded={isExpanded}
                              className="portal-admin-request-group-toggle"
                              onClick={() => {
                                setExpandedGroupKeys((current) => {
                                  const next = new Set(current);
                                  if (next.has(groupKey)) {
                                    next.delete(groupKey);
                                  } else {
                                    next.add(groupKey);
                                  }
                                  return next;
                                });
                              }}
                              type="button"
                            >
                              <span aria-hidden="true" className="portal-admin-request-group-chevron">
                                {isExpanded ? '▾' : '▸'}
                              </span>
                              <span className="portal-admin-request-group-toggle-main">
                                <span className="portal-admin-request-group-label">{group.label}</span>
                                <span className="portal-admin-request-group-request-count">
                                  {formatRequestCountLabel(group.requestCount)}
                                </span>
                              </span>
                              <span className="portal-admin-request-group-total">
                                <span>{formatTotalQuantityLabel(group.totalQuantity)}</span>
                                {group.totalPriceUsd !== null ? (
                                  <strong>{formatGroupPrice(group.totalPriceUsd)}</strong>
                                ) : (
                                  <strong>Unpriced</strong>
                                )}
                              </span>
                            </button>
                          </h3>
                          {isExpanded ? (
                            <div className="portal-admin-request-list" id={panelId}>
                              {group.requests.map((request) => (
                                <article className="portal-admin-request-card" key={request.printRequestId}>
                                  <header>
                                    <div>
                                      <h4>{request.name}</h4>
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
                                  <div className="portal-admin-request-stats" aria-label="Request metrics">
                                    <span className="portal-admin-stat-pill">
                                      Designs <strong>{request.designQty}</strong>
                                    </span>
                                    <span className="portal-admin-stat-pill">
                                      Prints <strong>{request.printQty}</strong>
                                    </span>
                                    <span className="portal-admin-stat-pill">
                                      Request total <strong>{formatUsd(request.requestTotalPriceUsd)}</strong>
                                    </span>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <div hidden id={panelId} />
                          )}
                        </section>
                      );
                    })}
                  </div>
                )}
              </>
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
