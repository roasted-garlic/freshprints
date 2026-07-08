'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { derivePrintRequestQueueState } from '@fresh-prints/shared/utils/printRequestQueueState';
import { getPrintRequestProgressLabel } from '@fresh-prints/shared/utils/printRequestProgressDisplay';
import {
  PORTAL_PRINT_REQUEST_LIST_TAB_PARAM,
  getPortalPrintRequestListTabLabel,
  parsePortalPrintRequestListTab,
  type PortalPrintRequestListTab,
} from '@fresh-prints/shared/utils/portalPrintRequestListTabs';

import { PrintRequestCard } from '../../../features/print-requests/components/PrintRequestCard';
import { PrintRequestsTabGuide } from '../../../features/print-requests/components/PrintRequestsTabGuide';
import { usePortalPrintRequests } from '../../../features/print-requests/context/PortalPrintRequestContext';
import { getPortalPrintRequestTabEmptyCopy, getPortalPrintRequestsEmptyPageCopy } from '../../../features/print-requests/utils/portalPrintRequestTabCopy';
import { LibraryIcon, PlusCircleIcon } from '../../../features/shared/components/PortalIcons';

const PORTAL_REQUEST_TABS: PortalPrintRequestListTab[] = ['working', 'queued', 'printing', 'printed'];

function buildRequestsPageHref(tab: PortalPrintRequestListTab): string {
  return `/requests?tab=${tab}`;
}

function getEmptyTabTitle(tab: PortalPrintRequestListTab): string {
  switch (tab) {
    case 'working':
      return 'No working requests';
    case 'queued':
      return 'No queued requests';
    case 'printing':
      return 'No printing requests';
    case 'printed':
      return 'No printed requests';
  }
}

function getEmptyTabMessage(tab: PortalPrintRequestListTab): string {
  return getPortalPrintRequestTabEmptyCopy(tab);
}

export default function RequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parsePortalPrintRequestListTab(searchParams.get(PORTAL_PRINT_REQUEST_LIST_TAB_PARAM));
  const {
    actionError,
    allocationTotalsByRequestId,
    error,
    handleStartRequestClick,
    isCreating,
    isLoading,
    requests,
    requestsByTab,
    summariesByRequestId,
  } = usePortalPrintRequests();

  const visibleRequests = requestsByTab[activeTab];

  function setActiveTab(tab: PortalPrintRequestListTab) {
    router.replace(buildRequestsPageHref(tab));
  }

  return (
    <main className={`portal-page portal-requests-page${isCreating ? ' is-creating-request' : ''}`}>
      <header className="portal-page-header portal-requests-header">
        <div>
          <h1>Print requests</h1>
          <p className="portal-muted">
            Track requests while you build them, after they are queued to a show&apos;s print run, while they
            print, and once production is complete.
          </p>
        </div>
        {!isLoading && requests.length > 0 ? (
          <button
            className="portal-button portal-button-primary portal-button-leading-icon"
            disabled={isCreating}
            onClick={() => void handleStartRequestClick()}
            type="button"
          >
            <PlusCircleIcon />
            {isCreating ? 'Starting…' : 'Start request'}
          </button>
        ) : null}
      </header>

      {error ? (
        <p className="portal-error" role="alert">
          {error}
        </p>
      ) : null}

      {actionError ? (
        <p className="portal-error" role="alert">
          {actionError}
        </p>
      ) : null}

      {isLoading ? (
        <div className="portal-panel portal-muted">Loading print requests…</div>
      ) : requests.length === 0 ? (
        <section className="portal-panel portal-requests-empty">
          <h2>No print requests yet</h2>
          <p className="portal-muted">{getPortalPrintRequestsEmptyPageCopy()}</p>
          <div className="portal-requests-empty-actions">
            <button
              className="portal-button portal-button-primary portal-button-leading-icon"
              disabled={isCreating}
              onClick={() => void handleStartRequestClick()}
              type="button"
            >
              <PlusCircleIcon />
              {isCreating ? 'Starting…' : 'Start request'}
            </button>
            <Link
              className="portal-button portal-button-secondary portal-button-leading-icon"
              href="/catalog"
            >
              <LibraryIcon />
              Browse designs
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="portal-requests-tab-bar" role="tablist" aria-label="Print request filters">
            {PORTAL_REQUEST_TABS.map((tab) => (
              <button
                aria-selected={activeTab === tab}
                className={`portal-requests-tab-button${activeTab === tab ? ' is-active' : ''}`}
                key={tab}
                onClick={() => setActiveTab(tab)}
                role="tab"
                type="button"
              >
                {getPortalPrintRequestListTabLabel(tab)} ({requestsByTab[tab].length})
              </button>
            ))}
          </div>

          <PrintRequestsTabGuide tab={activeTab} />

          {visibleRequests.length === 0 ? (
            <section className="portal-panel portal-requests-empty">
              <h2>{getEmptyTabTitle(activeTab)}</h2>
              <p className="portal-muted">{getEmptyTabMessage(activeTab)}</p>
              {activeTab === 'working' ? (
                <div className="portal-requests-empty-actions">
                  <button
                    className="portal-button portal-button-primary portal-button-leading-icon"
                    disabled={isCreating}
                    onClick={() => void handleStartRequestClick()}
                    type="button"
                  >
                    <PlusCircleIcon />
                    {isCreating ? 'Starting…' : 'Start request'}
                  </button>
                  <Link
                    className="portal-button portal-button-secondary portal-button-leading-icon"
                    href="/catalog"
                  >
                    <LibraryIcon />
                    Browse designs
                  </Link>
                </div>
              ) : null}
            </section>
          ) : (
            <section className="portal-request-list" role="list">
              {visibleRequests.map((request) => {
                const summary = summariesByRequestId[request.id] ?? { totalQuantity: 0, uniqueDesignCount: 0 };
                const allocationTotals = allocationTotalsByRequestId[request.id] ?? {
                  totalAllocatedQuantity: 0,
                  totalInProgressQuantity: 0,
                  totalPrintedQuantity: 0,
                };
                const progressLabel = getPrintRequestProgressLabel(
                  derivePrintRequestQueueState({
                    totalRequestedQuantity: summary.totalQuantity,
                    totalAllocatedQuantity: allocationTotals.totalAllocatedQuantity,
                    totalInProgressQuantity: allocationTotals.totalInProgressQuantity,
                    totalPrintedQuantity: allocationTotals.totalPrintedQuantity,
                  }),
                );

                return (
                  <div key={request.id} role="listitem">
                    <PrintRequestCard progressLabel={progressLabel} request={request} />
                  </div>
                );
              })}
            </section>
          )}
        </>
      )}
    </main>
  );
}
