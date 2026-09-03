'use client';

import Link from 'next/link';

import { ClipboardListIcon } from '../../shared/components/PortalIcons';
import { usePortalPrintRequests } from '../context/PortalPrintRequestContext';
import { buildRequestDetailHref } from '../utils/portalRequestDetailReturn';

const SITEWIDE_HINT = 'Updating a request pulled off of a show.';
/** Shorter copy so pill + hint + CTA stay on one mobile row. */
const SITEWIDE_HINT_MOBILE = 'Updating request pulled from a show.';

/**
 * Authenticated Portal shell strip while Editing owns the active Continuable.
 * Full explanation lives on the Editing request detail page.
 */
export function PortalSiteWideEditingModeBanner() {
  const { isEditingModeActive, workingRequest } = usePortalPrintRequests();

  if (!isEditingModeActive || !workingRequest || workingRequest.status !== 'editing') {
    return null;
  }

  const editingHref = buildRequestDetailHref(workingRequest.id, { from: 'editing' });

  return (
    <div
      aria-live="polite"
      className="portal-editing-mode-banner portal-editing-mode-banner-sitewide"
      role="status"
    >
      <div className="portal-editing-mode-banner-inner">
        <span className="portal-editing-mode-banner-label">
          <ClipboardListIcon size={14} />
          Editing
        </span>
        <p className="portal-editing-mode-banner-hint portal-editing-mode-banner-hint-desktop">
          {SITEWIDE_HINT}
        </p>
        <p className="portal-editing-mode-banner-hint portal-editing-mode-banner-hint-mobile">
          {SITEWIDE_HINT_MOBILE}
        </p>
        <Link className="portal-editing-mode-banner-cta" href={editingHref}>
          View Request
        </Link>
      </div>
    </div>
  );
}
