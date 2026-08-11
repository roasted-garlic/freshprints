'use client';

import { useEffect, useState } from 'react';

import { PortalHelpAboutPanel } from './PortalHelpAboutPanel';
import { PORTAL_HELP_ABOUT_EYEBROW } from '../portalHelpContent';
import {
  dismissAboutModal,
  shouldShowAboutModalOnVisit,
} from '../utils/portalAboutModalPreference';

interface PortalAboutFirstVisitModalProps {
  /** When false, modal stays closed (auth/bootstrap/overlay gates). */
  isEligible: boolean;
}

/**
 * First-visit About modal — reuses Help About content constants via PortalHelpAboutPanel.
 * Browser-local dismiss/snooze only; storage failures fail open.
 */
export function PortalAboutFirstVisitModal({ isEligible }: PortalAboutFirstVisitModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (!isEligible) {
      setIsOpen(false);
      return;
    }
    setIsOpen(shouldShowAboutModalOnVisit());
  }, [isEligible]);

  if (!isOpen || !isEligible) {
    return null;
  }

  function handleDismiss() {
    dismissAboutModal({ dontShowAgain });
    setIsOpen(false);
  }

  return (
    <div
      aria-labelledby="portal-about-first-visit-title"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur"
      onClick={handleDismiss}
      role="dialog"
    >
      <div
        className="modal-panel portal-confirm-modal portal-about-first-visit-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="portal-about-first-visit-title">{PORTAL_HELP_ABOUT_EYEBROW}</h2>
        </header>
        <div className="modal-body">
          <PortalHelpAboutPanel />
        </div>
        <footer className="modal-footer portal-about-first-visit-footer">
          <label className="portal-about-first-visit-dont-show">
            <input
              checked={dontShowAgain}
              onChange={(event) => setDontShowAgain(event.target.checked)}
              type="checkbox"
            />
            <span>Don&apos;t show this again</span>
          </label>
          <button className="portal-button portal-button-primary" onClick={handleDismiss} type="button">
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
