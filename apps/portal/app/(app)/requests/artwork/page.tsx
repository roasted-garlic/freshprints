'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { ArtworkQualityNotice } from '../../../../features/customer-uploads/components/ArtworkQualityNotice';
import { CustomerUploadPanel } from '../../../../features/customer-uploads/components/CustomerUploadPanel';
import { usePortalPrintRequests } from '../../../../features/print-requests/context/PortalPrintRequestContext';
import {
  CATALOG_HOME_PATH,
  CATALOG_LIBRARY_PATH,
  sanitizePortalReturnTo,
} from '../../../../features/print-requests/utils/catalogSelectionNavigation';
import {
  buildRequestDetailHref,
  parsePortalRequestDetailFrom,
} from '../../../../features/print-requests/utils/portalRequestDetailReturn';
import { CheckIcon } from '../../../../features/shared/components/PortalIcons';

/**
 * Dedicated request-artwork upload page (printing / Current Request only).
 * Not a donation inbox — future image donations are a separate product path.
 */
export default function RequestArtworkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshRequests, workingRequest } = usePortalPrintRequests();
  const [attachedRequestId, setAttachedRequestId] = useState<string | null>(null);

  function handleBack() {
    const returnTo = sanitizePortalReturnTo(searchParams.get('returnTo'));
    if (returnTo) {
      router.push(returnTo);
      return;
    }

    const from = parsePortalRequestDetailFrom(searchParams.get('from'));
    if (from === 'discover') {
      router.push(CATALOG_HOME_PATH);
      return;
    }
    if (from === 'library') {
      router.push(CATALOG_LIBRARY_PATH);
      return;
    }
    if (
      from === 'requests' ||
      from === 'working' ||
      from === 'queued' ||
      from === 'printing' ||
      from === 'printed'
    ) {
      router.push(from === 'requests' ? '/requests' : `/requests?tab=${from}`);
      return;
    }

    if (workingRequest) {
      router.push(buildRequestDetailHref(workingRequest.id, { from: 'library' }));
      return;
    }

    router.push(CATALOG_HOME_PATH);
  }

  if (attachedRequestId) {
    const reviewHref = buildRequestDetailHref(attachedRequestId, { from: 'library' });
    return (
      <main className="portal-page request-artwork-page request-artwork-page-success">
        <section aria-labelledby="request-artwork-success-title" className="request-artwork-success">
          <div aria-hidden className="request-artwork-success-badge">
            <CheckIcon size={28} />
          </div>
          <div className="request-artwork-success-copy">
            <p className="request-artwork-success-kicker">Attached</p>
            <h1 id="request-artwork-success-title">Artwork added</h1>
            <p className="request-artwork-success-lead">
              Your uploads are attached and ready to size, set quantity, and pick a show.
            </p>
          </div>
          <ul className="request-artwork-success-notes">
            <li>
              <span className="request-artwork-success-note-dot is-ready" />
              Ready to review in your Current Request
            </li>
            <li>
              <span className="request-artwork-success-note-dot is-muted" />
              Not added to a show or the Design Library automatically
            </li>
          </ul>
          <div className="request-artwork-page-actions">
            <Link className="portal-button portal-button-primary" href={reviewHref}>
              Review Request
            </Link>
            <Link className="portal-button portal-button-secondary" href="/catalog">
              Continue browsing
            </Link>
            <button
              className="portal-button portal-button-secondary"
              onClick={() => setAttachedRequestId(null)}
              type="button"
            >
              Upload more
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="portal-page request-artwork-page">
      <header className="portal-page-header request-artwork-page-header">
        <h1>Upload Designs</h1>
        <p className="portal-muted request-artwork-page-lead">
          Add artwork to print with your Current Request.
          {!workingRequest
            ? ' A request is created when you attach ready files.'
            : null}
        </p>
        <ArtworkQualityNotice purpose="print_request" />
      </header>
      <CustomerUploadPanel
        onAttached={(printRequestId) => {
          void refreshRequests({ silent: true });
          setAttachedRequestId(printRequestId);
        }}
        onClose={handleBack}
        purpose="print_request"
        variant="embedded"
      />
    </main>
  );
}
