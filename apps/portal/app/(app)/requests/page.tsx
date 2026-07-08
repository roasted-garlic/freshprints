'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PrintRequestCard } from '../../../features/print-requests/components/PrintRequestCard';
import { useMyPrintRequests } from '../../../features/print-requests/hooks/useMyPrintRequests';

export default function RequestsPage() {
  const router = useRouter();
  const { requests, isLoading, error, createPrintRequest } = useMyPrintRequests();
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
          <p className="portal-muted">Create and track your print requests from the design library.</p>
        </div>
        <button
          className="portal-button portal-button-primary"
          disabled={isCreating}
          onClick={() => void handleCreateRequest()}
          type="button"
        >
          {isCreating ? 'Creating…' : 'New request'}
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
              {isCreating ? 'Creating…' : 'Create print request'}
            </button>
            <Link className="portal-button portal-button-secondary" href="/catalog">
              Browse designs
            </Link>
          </div>
        </section>
      ) : (
        <section className="portal-request-list" role="list">
          {requests.map((request) => (
            <div key={request.id} role="listitem">
              <PrintRequestCard request={request} />
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
