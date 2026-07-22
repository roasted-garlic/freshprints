'use client';

import { useEffect, useState } from 'react';

import {
  formatWorkingRequestLimitBannerCopy,
  formatWorkingRequestLimitHelpModalCopy,
  resolveWorkingRequestLimitBannerTone,
  WORKING_REQUEST_LIMIT_HELP_MODAL_TITLE,
  type WorkingRequestLimitBannerTone,
} from '@fresh-prints/shared/utils/printRequestWorkingRequestMax';

import { CircleHelpIcon, XIcon } from '../../shared/components/PortalIcons';
import { usePortalPrintRequests } from '../context/PortalPrintRequestContext';

function toneClassName(tone: WorkingRequestLimitBannerTone): string {
  if (tone === 'exhausted') {
    return 'is-exhausted';
  }
  if (tone === 'warning') {
    return 'is-warning';
  }
  return 'is-healthy';
}

export function PortalWorkingRequestLimitBanner() {
  const { workingRequestLimit } = usePortalPrintRequests();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    if (!isHelpOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsHelpOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHelpOpen]);

  if (
    !workingRequestLimit.isReady ||
    workingRequestLimit.limit == null ||
    !Number.isFinite(workingRequestLimit.limit)
  ) {
    return null;
  }

  const limit = workingRequestLimit.limit;
  const remaining = workingRequestLimit.roomRemaining;
  const tone = resolveWorkingRequestLimitBannerTone(remaining, limit);
  const bannerCopy = formatWorkingRequestLimitBannerCopy(remaining, limit);
  // Sole limit L drives both request capacity and per-show cap (ADR-FP-102).
  const helpLines = formatWorkingRequestLimitHelpModalCopy(limit, limit);

  return (
    <>
      <div
        aria-live="polite"
        className={`portal-print-request-quota-banner ${toneClassName(tone)}`}
        role="status"
      >
        <div className="portal-print-request-quota-banner-inner">
          <div className="portal-print-request-quota-banner-status">
            <span className="portal-print-request-quota-banner-text">{bannerCopy}</span>
            <button
              aria-label="About print limits"
              className="portal-print-request-quota-banner-help"
              onClick={() => setIsHelpOpen(true)}
              type="button"
            >
              <CircleHelpIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {isHelpOpen ? (
        <div
          aria-labelledby="portal-print-request-quota-help-title"
          aria-modal="true"
          className="modal-overlay modal-overlay-blur portal-print-request-quota-help-overlay"
          onClick={() => setIsHelpOpen(false)}
          role="dialog"
        >
          <div
            className="modal-panel portal-print-request-quota-help-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <h2 id="portal-print-request-quota-help-title">
                {WORKING_REQUEST_LIMIT_HELP_MODAL_TITLE}
              </h2>
              <button
                aria-label="Close"
                className="modal-close-button"
                onClick={() => setIsHelpOpen(false)}
                type="button"
              >
                <XIcon size={18} />
              </button>
            </header>
            <div className="modal-body">
              {helpLines.map((line) => (
                <p className="portal-print-request-quota-help-copy" key={line}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
