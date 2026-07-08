'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import {
  PORTAL_PRINT_REQUEST_LIST_TAB_PARAM,
  getPortalPrintRequestListTabLabel,
  parsePortalPrintRequestListTab,
  type PortalPrintRequestListTab,
} from '@fresh-prints/shared/utils/portalPrintRequestListTabs';

import { PrintRequestCard } from '../../../features/print-requests/components/PrintRequestCard';
import { useMyPrintRequests } from '../../../features/print-requests/hooks/useMyPrintRequests';

const PORTAL_REQUEST_TABS: PortalPrintRequestListTab[] = ['working', 'queued', 'printed'];

function buildRequestsPageHref(tab: PortalPrintRequestListTab): string {
  return `/requests?tab=${tab}`;
}

export default function RequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parsePortalPrintRequestListTab(searchParams.get(PORTAL_PRINT_REQUEST_LIST_TAB_PARAM));
  const { requests, requestsByTab, isLoading, error, createPrintRequest } = useMyPrintRequests();
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const visibleRequests = requestsByTab[activeTab];

  function setActiveTab(tab: PortalPrintRequestListTab) {
    router.replace(buildRequestsPageHref(tab));
  }

  async function handleCreateRequest() {
    setIsCreating(true);
    setActionError(null);

    try {
      const created = await createPrintRequest();
      router.push(`/catalog?mode=request-selection&requestId=${created.printRequestId}`);
    } catch (createError) {
      setActionError(createError instanceof Error ? createError.message : 'Unable to create print request.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="portal-page portal-requests-page">
      <header className="portal-page-header portal-requests-header">
        <div>
          <h1>Print requests</h1>
          <p className="portal-muted">
            Track requests while you build them, after they are queued to a show, and once printing is complete.
          </p>
        </div>
        <button
          className="portal-button portal-button-primary"
          disabled={isCreating}
          onClick={() => void handleCreateRequest()}
          type="button"
        >
          {isCreating ? 'Starting…' : 'Start request'}
        </button>
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
          <p className="portal-muted">
            Start a request from the design library or create one here, then add designs with quantities.
          </p>
          <div className="portal-requests-empty-actions">
            <button
              className="portal-button portal-button-primary"
              disabled={isCreating}
              onClick={() => void handleCreateRequest()}
              type="button"
            >
              {isCreating ? 'Starting…' : 'Start request'}
            </button>
            <Link className="portal-button portal-button-secondary" href="/catalog">
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

          {visibleRequests.length === 0 ? (
            <section className="portal-panel portal-requests-empty">
              <h2>
                {activeTab === 'working'
                  ? 'No working requests'
                  : activeTab === 'queued'
                    ? 'No queued requests'
                    : 'No printed requests'}
              </h2>
              <p className="portal-muted">
                {activeTab === 'working'
                  ? 'Working requests are drafts you are still building or revising before they go to a show.'
                  : activeTab === 'queued'
                    ? 'Queued requests have been added to an upcoming show and are waiting to print.'
                    : 'Printed requests have finished production.'}
              </p>
              {activeTab === 'working' ? (
                <div className="portal-requests-empty-actions">
                  <button
                    className="portal-button portal-button-primary"
                    disabled={isCreating}
                    onClick={() => void handleCreateRequest()}
                    type="button"
                  >
                    {isCreating ? 'Starting…' : 'Start request'}
                  </button>
                  <Link className="portal-button portal-button-secondary" href="/catalog">
                    Browse designs
                  </Link>
                </div>
              ) : null}
            </section>
          ) : (
            <section className="portal-request-list" role="list">
              {visibleRequests.map((request) => (
                <div key={request.id} role="listitem">
                  <PrintRequestCard request={request} />
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
