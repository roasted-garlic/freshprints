'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { CustomerUploadPanel } from '../../../features/customer-uploads/components/CustomerUploadPanel';
import {
  CATALOG_HOME_PATH,
  sanitizePortalReturnTo,
} from '../../../features/print-requests/utils/catalogSelectionNavigation';
import { CheckIcon } from '../../../features/shared/components/PortalIcons';

/**
 * Catalog donation upload page — same technical pipeline as request artwork,
 * without attaching to a print request (ADR-FP-076 / donate purpose).
 */
export default function DonateDesignsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitted, setSubmitted] = useState(false);

  function handleBack() {
    const returnTo = sanitizePortalReturnTo(searchParams.get('returnTo'));
    if (returnTo) {
      router.push(returnTo);
      return;
    }
    router.back();
  }

  if (submitted) {
    const returnTo = sanitizePortalReturnTo(searchParams.get('returnTo')) ?? CATALOG_HOME_PATH;
    return (
      <main className="portal-page request-artwork-page request-artwork-page-success">
        <section aria-labelledby="donate-designs-success-title" className="request-artwork-success">
          <div aria-hidden className="request-artwork-success-badge">
            <CheckIcon size={28} />
          </div>
          <div className="request-artwork-success-copy">
            <p className="request-artwork-success-kicker">Submitted</p>
            <h1 id="donate-designs-success-title">Donation received</h1>
            <p className="request-artwork-success-lead">
              Thanks for sharing your artwork. Fresh Prints will review it before anything is listed
              in the Design Library.
            </p>
          </div>
          <ul className="request-artwork-success-notes">
            <li>
              <span className="request-artwork-success-note-dot is-ready" />
              Sent for staff review — not added to your Current Request
            </li>
            <li>
              <span className="request-artwork-success-note-dot is-muted" />
              Listing for other customers only happens after approval
            </li>
          </ul>
          <div className="request-artwork-page-actions">
            <Link className="portal-button portal-button-primary" href={returnTo}>
              Continue
            </Link>
            <button
              className="portal-button portal-button-secondary"
              onClick={() => setSubmitted(false)}
              type="button"
            >
              Donate more
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="portal-page request-artwork-page">
      <header className="portal-page-header request-artwork-page-header">
        <h1>Donate Designs</h1>
        <p className="portal-muted request-artwork-page-lead">
          Send artwork you think Fresh Prints should list in the Design Library for you and other
          customers. This does not add files to your Current Request.
        </p>
      </header>
      <CustomerUploadPanel
        onClose={handleBack}
        onDonated={() => setSubmitted(true)}
        purpose="catalog_donation"
        variant="embedded"
      />
    </main>
  );
}
