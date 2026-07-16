'use client';

import { useEffect, useState } from 'react';

import type { EtsyRecommendationSuggestionKind } from '@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendation.constants';

interface EtsySaveSuggestionActionProps {
  kind: EtsyRecommendationSuggestionKind;
  label: string;
  /** Kept for call-site compatibility; customer suggestions are requests only. */
  apiToken?: string;
  /** Kept for call-site compatibility; no immediate list mutation on Portal. */
  onSaved?: () => void;
}

/**
 * Customer-facing "suggest this term" action.
 * Does not write to the shared suggestion list — that happens in Studio Settings.
 */
export function EtsySaveSuggestionAction({
  kind,
  label,
}: EtsySaveSuggestionActionProps) {
  const [status, setStatus] = useState<'idle' | 'requested'>('idle');
  const trimmed = label.trim();

  useEffect(() => {
    setStatus('idle');
  }, [trimmed, kind]);

  if (!trimmed) {
    return null;
  }

  if (status === 'requested') {
    return (
      <p className="etsy-save-suggestion etsy-save-suggestion--success portal-muted" role="status">
        Thanks. We noted “{trimmed}” as a suggestion request. It won&apos;t appear in the list
        until Fresh Prints adds it.
      </p>
    );
  }

  return (
    <p className="etsy-save-suggestion portal-muted">
      <button
        className="etsy-save-suggestion-link"
        onClick={() => setStatus('requested')}
        type="button"
      >
        {`Suggest “${trimmed}” be added to the suggestions`}
      </button>
    </p>
  );
}
