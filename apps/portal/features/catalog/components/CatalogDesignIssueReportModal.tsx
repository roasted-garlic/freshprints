'use client';
import { useEffect, useId, useRef } from 'react';
import { DESIGN_ISSUE_REPORT_DESCRIPTION_MAX } from '@fresh-prints/shared/designIssueReports/designIssueReport.constants';
import { useCatalogDesignIssueReport } from '../hooks/useCatalogDesignIssueReport';

function CloseIcon() {
  return <svg aria-hidden="true" height="18" viewBox="0 0 24 24" width="18"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
}

export function CatalogDesignIssueReportModal({ designId, isOpen, onClose }: { designId: string; isOpen: boolean; onClose: () => void }) {
  const titleId = useId(); const descriptionId = useId(); const firstRef = useRef<HTMLTextAreaElement>(null); const panelRef = useRef<HTMLDivElement>(null);
  const report = useCatalogDesignIssueReport(designId);
  const { isSubmitting, reset } = report;
  useEffect(() => { if (!isOpen) return; firstRef.current?.focus(); const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && !isSubmitting) onClose(); if (event.key === 'Tab') { const controls = [...(panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled])') ?? [])]; if (controls.length === 0) return; const first = controls[0]; const last = controls[controls.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [isOpen, isSubmitting, onClose]);
  useEffect(() => { if (!isOpen) reset(); }, [isOpen, reset]);
  if (!isOpen) return null;
  return <div aria-describedby={descriptionId} aria-labelledby={titleId} aria-modal="true" className="modal-overlay modal-overlay-blur design-issue-report-overlay" role="dialog">
    <div className="modal-panel design-issue-report-modal" ref={panelRef}>
      <button aria-label="Close report form" className="modal-close-button design-issue-report-close-button" disabled={report.isSubmitting} onClick={onClose} type="button"><CloseIcon /></button>
      <div className="modal-body">
        <h2 id={titleId}>Report an Issue</h2>
        <p id={descriptionId}>Tell us about misspellings, wrong names, duplicates, metadata, or artwork problems.</p>
        {report.isSuccess ? <div aria-live="polite" className="portal-success-message"><p>Thanks. Your report was submitted for staff review.</p><button className="portal-button portal-button-primary" onClick={onClose} type="button">Done</button></div> : <>
          <label className="portal-field"><span>Design ID</span><input readOnly value={designId} /></label>
          <label className="portal-field"><span>Problem description</span><textarea ref={firstRef} maxLength={DESIGN_ISSUE_REPORT_DESCRIPTION_MAX} onChange={(e) => report.setDescription(e.target.value)} required rows={6} value={report.description} /></label>
          <p className="design-issue-report-counter">{report.description.length} / {DESIGN_ISSUE_REPORT_DESCRIPTION_MAX}</p>
          {report.error ? <p aria-live="assertive" className="portal-form-error">{report.error}</p> : null}
          <div className="modal-actions design-issue-report-actions"><button className="portal-button portal-button-secondary" disabled={report.isSubmitting} onClick={onClose} type="button">Cancel</button><button className="portal-button portal-button-primary" disabled={report.isSubmitting} onClick={() => void report.submit()} type="button">{report.isSubmitting ? 'Submitting…' : 'Submit Report'}</button></div>
        </>}
      </div>
    </div>
  </div>;
}
