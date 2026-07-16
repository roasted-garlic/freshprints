import {
  ETSY_RECOMMENDATION_DRAFT_STORAGE_KEY,
  ETSY_RECOMMENDATION_MAX_STYLE_TEXT_LENGTH,
} from '@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendation.constants';

export type EtsyRecommendationDraftStep = 'screen1' | 'screen2' | 'screen3' | 'review';

export interface EtsyRecommendationDraft {
  step: EtsyRecommendationDraftStep;
  subjectText: string;
  /** Free-text tone / style (optional). */
  styleText: string;
  wording: string;
}

const VALID_STEPS = new Set<EtsyRecommendationDraftStep>([
  'screen1',
  'screen2',
  'screen3',
  'review',
]);

function normalizeStyleText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().replace(/\s+/g, ' ').slice(0, ETSY_RECOMMENDATION_MAX_STYLE_TEXT_LENGTH);
}

export function isValidEtsyRecommendationDraft(value: unknown): value is EtsyRecommendationDraft {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const raw = value as Record<string, unknown>;
  if (typeof raw.step !== 'string' || !VALID_STEPS.has(raw.step as EtsyRecommendationDraftStep)) {
    return false;
  }
  if (typeof raw.subjectText !== 'string' || typeof raw.wording !== 'string') {
    return false;
  }
  if (typeof raw.styleText === 'string') {
    return true;
  }
  // Tolerate brief migration from v3 drafts that still had `styles: string[]`.
  return Array.isArray(raw.styles);
}

export function loadEtsyRecommendationDraft(): EtsyRecommendationDraft | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(ETSY_RECOMMENDATION_DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidEtsyRecommendationDraft(parsed)) {
      clearEtsyRecommendationDraft();
      return null;
    }
    const record = parsed as unknown as Record<string, unknown>;
    let styleText = normalizeStyleText(record.styleText);
    if (!styleText && Array.isArray(record.styles)) {
      styleText = normalizeStyleText(
        record.styles.filter((entry): entry is string => typeof entry === 'string').join(' '),
      );
    }
    return {
      step: parsed.step,
      subjectText: parsed.subjectText,
      styleText,
      wording: parsed.wording,
    };
  } catch {
    clearEtsyRecommendationDraft();
    return null;
  }
}

export function saveEtsyRecommendationDraft(draft: EtsyRecommendationDraft): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(ETSY_RECOMMENDATION_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearEtsyRecommendationDraft(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(ETSY_RECOMMENDATION_DRAFT_STORAGE_KEY);
}

export function hasResumableEtsyRecommendationDraft(
  draft: EtsyRecommendationDraft | null = loadEtsyRecommendationDraft(),
): boolean {
  if (!draft) {
    return false;
  }
  return (
    draft.subjectText.trim().length > 0 ||
    draft.styleText.trim().length > 0 ||
    draft.wording.trim().length > 0
  );
}
