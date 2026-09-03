'use client';

import Link from 'next/link';

import {
  PORTAL_PARKED_DRAFT_OVERLAY_BODY,
  PORTAL_PARKED_DRAFT_OVERLAY_CTA,
  PORTAL_PARKED_DRAFT_OVERLAY_TITLE,
} from '@fresh-prints/shared/utils/portalActiveEditablePrintRequest';

import { buildRequestDetailHref } from '../utils/portalRequestDetailReturn';

interface PortalParkedDraftOverlayProps {
  editingRequestId: string;
}

/**
 * Full blocking overlay for a parked Working draft — mutation chrome remains
 * visible underneath for reference but is not interactive.
 */
export function PortalParkedDraftOverlay({ editingRequestId }: PortalParkedDraftOverlayProps) {
  return (
    <div className="portal-parked-draft-overlay" role="alertdialog" aria-modal="true" aria-labelledby="portal-parked-draft-overlay-title">
      <div className="portal-parked-draft-overlay-card">
        <h2 id="portal-parked-draft-overlay-title">{PORTAL_PARKED_DRAFT_OVERLAY_TITLE}</h2>
        <p>{PORTAL_PARKED_DRAFT_OVERLAY_BODY}</p>
        <Link
          className="portal-button portal-button-primary"
          href={buildRequestDetailHref(editingRequestId, { from: 'editing' })}
        >
          {PORTAL_PARKED_DRAFT_OVERLAY_CTA}
        </Link>
      </div>
    </div>
  );
}
