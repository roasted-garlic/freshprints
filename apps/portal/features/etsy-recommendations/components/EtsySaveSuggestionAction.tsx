'use client';

import { useEffect, useState } from 'react';

import type { EtsyRecommendationSuggestionKind } from '@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendation.constants';

import { submitEtsySuggestionRequest } from '../services/etsySuggestionRequestService';

interface EtsySaveSuggestionActionProps {
  kind: EtsyRecommendationSuggestionKind;
  label: string;
  /** Subject search token; defaults to label server-side. */
  apiToken?: string;
  /** Kept for call-site compatibility; list mutation happens after Studio approval. */
  onSaved?: () => void;
}

/**
 * Customer-facing "suggest this term" action.
 * Persists a pending review request; does not mutate the live suggestion list.
 */
export function EtsySaveSuggestionAction({
  kind,
  label,
  apiToken,
}: EtsySaveSuggestionActionProps) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'requested' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const trimmed = label.trim();

  useEffect(() => {
    setStatus('idle');
    setErrorMessage(null);
  }, [trimmed, kind, apiToken]);

  if (!trimmed) {
    return null;
  }

  async function handleSubmit() {
    setStatus('submitting');
    setErrorMessage(null);
    try {
      await submitEtsySuggestionRequest({
        kind,
        label: trimmed,
        ...(kind === 'subject' && apiToken?.trim() ? { apiToken: apiToken.trim() } : {}),
      });
      setStatus('requested');
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to submit that suggestion request.',
      );
    }
  }

  if (status === 'requested') {
    return (
      <p className="etsy-save-suggestion etsy-save-suggestion--success portal-muted" role="status">
        Thanks. We received your request to add “{trimmed}”. It won&apos;t appear in suggestions
        until Fresh Prints reviews and approves it.
      </p>
    );
  }

  return (
    <p className="etsy-save-suggestion portal-muted">
      <button
        className="etsy-save-suggestion-link"
        disabled={status === 'submitting'}
        onClick={() => void handleSubmit()}
        type="button"
      >
        {status === 'submitting'
          ? 'Sending request…'
          : `Suggest “${trimmed}” be added to the suggestions`}
      </button>
      {status === 'error' && errorMessage ? (
        <span className="etsy-save-suggestion-error" role="alert">
          {' '}
          {errorMessage}
        </span>
      ) : null}
    </p>
  );
}
