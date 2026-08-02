'use client';
import { useEffect, useId, useRef } from 'react';
import { DESIGN_ISSUE_REPORT_DESCRIPTION_MAX } from '@fresh-prints/shared/designIssueReports/designIssueReport.constants';
import { useCatalogDesignIssueReport } from '../hooks/useCatalogDesignIssueReport';

function CloseIcon() {
  return <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
}

function AnimatedSuccessCheck() {
  return (
    <svg aria-hidden="true" className="design-issue-report-success-check" fill="none" viewBox="0 0 64 64">
      <circle className="design-issue-report-success-check-circle" cx="32" cy="32" r="28" />
      <path className="design-issue-report-success-check-mark" d="M20 33.5 28.5 42 44 24" />
    </svg>
  );
}

export function CatalogDesignIssueReportModal({ designId, isOpen, onClose }: { designId: string; isOpen: boolean; onClose: () => void }) {
  const titleId = useId();
  const descriptionId = useId();
  const firstRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const report = useCatalogDesignIssueReport(designId);
  const { isSubmitting, isSuccess, reset } = report;

  useEffect(() => {
    if (!isOpen) return;
    if (!isSuccess) firstRef.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
      if (event.key === 'Tab') {
        const controls = [...(panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled])') ?? [])];
        if (controls.length === 0) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [isOpen, isSubmitting, isSuccess, onClose]);

  useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  if (!isOpen) return null;

  return (
    <div
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="modal-overlay modal-overlay-blur design-issue-report-overlay"
      role="dialog"
    >
      <div className="modal-panel design-issue-report-modal" ref={panelRef}>
        <button
          aria-label="Close report form"
          className="modal-close-button design-issue-report-close-button"
          disabled={report.isSubmitting}
          onClick={onClose}
          type="button"
        >
          <CloseIcon />
        </button>
        <div className="modal-body">
          {isSuccess ? (
            <div aria-live="polite" className="design-issue-report-success">
              <div className="design-issue-report-success-badge">
                <AnimatedSuccessCheck />
              </div>
              <div className="design-issue-report-success-copy">
                <h2 id={titleId}>Report sent</h2>
                <p id={descriptionId}>We’ll take a look.</p>
              </div>
              <button className="portal-button portal-button-primary" onClick={onClose} type="button">
                Done
              </button>
            </div>
          ) : (
            <>
              <h2 id={titleId}>Report an Issue</h2>
              <p id={descriptionId}>Tell us about misspellings, wrong names, duplicates, metadata, or artwork problems.</p>
              <label className="portal-field">
                <span>Design ID</span>
                <input readOnly value={designId} />
              </label>
              <label className="portal-field">
                <span>Problem description</span>
                <textarea
                  ref={firstRef}
                  maxLength={DESIGN_ISSUE_REPORT_DESCRIPTION_MAX}
                  onChange={(e) => report.setDescription(e.target.value)}
                  required
                  rows={6}
                  value={report.description}
                />
              </label>
              <p className="design-issue-report-counter">
                {report.description.length} / {DESIGN_ISSUE_REPORT_DESCRIPTION_MAX}
              </p>
              {report.error ? (
                <p aria-live="assertive" className="portal-form-error">
                  {report.error}
                </p>
              ) : null}
              <div className="modal-actions design-issue-report-actions">
                <button className="portal-button portal-button-secondary" disabled={report.isSubmitting} onClick={onClose} type="button">
                  Cancel
                </button>
                <button
                  className="portal-button portal-button-primary"
                  disabled={report.isSubmitting}
                  onClick={() => void report.submit()}
                  type="button"
                >
                  {report.isSubmitting ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
