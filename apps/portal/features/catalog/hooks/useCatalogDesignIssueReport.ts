'use client';
import { useCallback, useState } from 'react';
import { DESIGN_ISSUE_REPORT_DESCRIPTION_MAX, DESIGN_ISSUE_REPORT_DESCRIPTION_MIN, normalizeDesignIssueReportDescription } from '@fresh-prints/shared/designIssueReports/designIssueReport.constants';
import { catalogDesignIssueReportService } from '../services/catalogDesignIssueReportService';

function newIntentKey() { return crypto.randomUUID().replaceAll('-', ''); }

export function useCatalogDesignIssueReport(designId: string) {
  const [description, setDescription] = useState('');
  const [intentKey, setIntentKey] = useState(newIntentKey);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const reset = useCallback(() => { setDescription(''); setIntentKey(newIntentKey()); setError(null); setIsSuccess(false); setIsSubmitting(false); }, []);
  const submit = useCallback(async () => {
    const normalized = normalizeDesignIssueReportDescription(description);
    if (normalized.length < DESIGN_ISSUE_REPORT_DESCRIPTION_MIN || normalized.length > DESIGN_ISSUE_REPORT_DESCRIPTION_MAX) {
      setError(`Description must be ${DESIGN_ISSUE_REPORT_DESCRIPTION_MIN}–${DESIGN_ISSUE_REPORT_DESCRIPTION_MAX} characters.`); return false;
    }
    if (isSubmitting) return false;
    setIsSubmitting(true); setError(null);
    try { await catalogDesignIssueReportService.submit({ designId, description: normalized, idempotencyKey: intentKey }); setIsSuccess(true); return true; }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to submit this report.'); return false; }
    finally { setIsSubmitting(false); }
  }, [description, designId, intentKey, isSubmitting]);
  return { description, setDescription, isSubmitting, error, isSuccess, submit, reset };
}
