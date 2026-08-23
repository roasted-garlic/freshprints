'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { derivePrintRequestQueueState } from '@fresh-prints/shared/utils/printRequestQueueState';
import { getPrintRequestProgressLabel } from '@fresh-prints/shared/utils/printRequestProgressDisplay';
import { resolvePortalPrintRequestProgressLabel } from '@fresh-prints/shared/utils/printRequestConversion';
import { buildPortalCustomerShowScheduleCardSummary } from '@fresh-prints/shared/utils/portalCustomerShowSchedule';
import {
  PORTAL_PRINT_REQUEST_LIST_TAB_PARAM,
  getPortalPrintRequestListTabLabel,
  parsePortalPrintRequestListTab,
  type PortalPrintRequestListTab,
} from '@fresh-prints/shared/utils/portalPrintRequestListTabs';

import { PrintRequestCard } from '../../../features/print-requests/components/PrintRequestCard';
import { PrintRequestsTabGuide } from '../../../features/print-requests/components/PrintRequestsTabGuide';
import { usePortalPrintRequests } from '../../../features/print-requests/context/PortalPrintRequestContext';
import {
  getPortalPrintRequestTabEmptyCopy,
  getPortalPrintRequestsEmptyPageCopyLines,
} from '../../../features/print-requests/utils/portalPrintRequestTabCopy';
import { LibraryIcon, ShoppingBagIcon } from '../../../features/shared/components/PortalIcons';

const PORTAL_REQUEST_TABS: PortalPrintRequestListTab[] = ['working', 'queued', 'printing', 'printed'];

function buildRequestsPageHref(tab: PortalPrintRequestListTab): string {
  return `/requests?tab=${tab}`;
}

function getEmptyTabTitle(tab: PortalPrintRequestListTab): string {
  switch (tab) {
    case 'working':
      return 'Current Request is open';
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
    isCreating,
    isLoading,
    openCurrentRequestDrawer,
    requests,
    requestsByTab,
    schedulesByRequestId,
    summariesByRequestId,
  } = usePortalPrintRequests();

  const visibleRequests = requestsByTab[activeTab];
  const [emptyCopyLineOne, emptyCopyLineTwo] = getPortalPrintRequestsEmptyPageCopyLines();

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
          <h2>Current Request is ready</h2>
          <p className="portal-muted portal-requests-empty-copy portal-requests-empty-copy-stacked">
            {emptyCopyLineOne}
          </p>
          <p className="portal-muted portal-requests-empty-copy portal-requests-empty-copy-stacked">
            {emptyCopyLineTwo}
          </p>
          <p className="portal-muted portal-requests-empty-copy portal-requests-empty-copy-inline">
            {emptyCopyLineOne} {emptyCopyLineTwo}
          </p>
          <div className="portal-requests-empty-actions">
            <Link
              className="portal-button portal-button-primary portal-button-leading-icon"
              href="/"
            >
              <LibraryIcon />
              Browse designs
            </Link>
            <button
              className="portal-button portal-button-secondary portal-button-leading-icon"
              onClick={openCurrentRequestDrawer}
              type="button"
            >
              <ShoppingBagIcon />
              Open Current Request
            </button>
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
                  <Link
                    className="portal-button portal-button-primary portal-button-leading-icon"
                    href="/"
                  >
                    <LibraryIcon />
                    Browse designs
                  </Link>
                  <button
                    className="portal-button portal-button-secondary portal-button-leading-icon"
                    onClick={openCurrentRequestDrawer}
                    type="button"
                  >
                    <ShoppingBagIcon />
                    Open Current Request
                  </button>
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
                const progressLabel = resolvePortalPrintRequestProgressLabel({
                  closureKind: request.closureKind,
                  status: request.status,
                  defaultLabel: getPrintRequestProgressLabel(
                    derivePrintRequestQueueState({
                      totalRequestedQuantity: summary.totalQuantity,
                      totalAllocatedQuantity: allocationTotals.totalAllocatedQuantity,
                      totalInProgressQuantity: allocationTotals.totalInProgressQuantity,
                      totalPrintedQuantity: allocationTotals.totalPrintedQuantity,
                    }),
                  ),
                });
                const scheduleLine = buildPortalCustomerShowScheduleCardSummary(
                  schedulesByRequestId[request.id] ?? [],
                ).line;

                return (
                  <div key={request.id} role="listitem">
                    <PrintRequestCard
                      fromTab={activeTab}
                      progressLabel={progressLabel}
                      request={request}
                      scheduleLine={scheduleLine}
                    />
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
