'use client';

import {
  PORTAL_EDITING_MODE_BANNER_WITH_PARKED_DRAFT,
  PORTAL_EDITING_MODE_BANNER_WITHOUT_PARKED_DRAFT,
} from '@fresh-prints/shared/utils/portalActiveEditablePrintRequest';

import { ClipboardListIcon } from '../../shared/components/PortalIcons';

interface PortalEditingModeBannerProps {
  hasParkedDraft: boolean;
}

/**
 * Full Editing explanation on the Editing request detail page.
 */
export function PortalEditingModeBanner({ hasParkedDraft }: PortalEditingModeBannerProps) {
  const message = hasParkedDraft
    ? PORTAL_EDITING_MODE_BANNER_WITH_PARKED_DRAFT
    : PORTAL_EDITING_MODE_BANNER_WITHOUT_PARKED_DRAFT;

  return (
    <div
      aria-live="polite"
      className="portal-editing-mode-banner"
      role="status"
    >
      <div className="portal-editing-mode-banner-inner">
        <span className="portal-editing-mode-banner-label">
          <ClipboardListIcon size={14} />
          Editing
        </span>
        <p className="portal-editing-mode-banner-text">{message}</p>
      </div>
    </div>
  );
}
