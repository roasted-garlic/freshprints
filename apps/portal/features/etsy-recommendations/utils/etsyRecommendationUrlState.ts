export type EtsyRecommendationView =
  | 'choose'
  | 'screen1'
  | 'screen2'
  | 'screen3'
  | 'review'
  | 'results';

export const ETSY_RECOMMENDATIONS_BASE_PATH = '/custom-designs';

export type EtsyRecommendationUrlStep =
  | 'choose'
  | 'subject'
  | 'style'
  | 'wording'
  | 'review'
  | 'results';

const VIEW_TO_URL_STEP: Record<EtsyRecommendationView, EtsyRecommendationUrlStep> = {
  choose: 'choose',
  screen1: 'subject',
  screen2: 'style',
  screen3: 'wording',
  review: 'review',
  results: 'results',
};

const URL_STEP_TO_VIEW: Record<
  Exclude<EtsyRecommendationUrlStep, 'choose'>,
  Exclude<EtsyRecommendationView, 'choose'>
> = {
  subject: 'screen1',
  style: 'screen2',
  wording: 'screen3',
  review: 'review',
  results: 'results',
};

export interface ParsedEtsyRecommendationUrl {
  step: EtsyRecommendationUrlStep;
  requestId: string | null;
}

export function parseEtsyRecommendationUrl(
  searchParams: URLSearchParams,
): ParsedEtsyRecommendationUrl {
  const stepRaw = searchParams.get('step')?.trim().toLowerCase();
  const requestId = searchParams.get('requestId')?.trim() || null;

  if (!stepRaw || stepRaw === 'choose') {
    return { step: 'choose', requestId: null };
  }

  if (stepRaw === 'results') {
    return { step: 'results', requestId };
  }

  if (
    stepRaw === 'subject' ||
    stepRaw === 'style' ||
    stepRaw === 'wording' ||
    stepRaw === 'review'
  ) {
    return { step: stepRaw, requestId: null };
  }

  return { step: 'choose', requestId: null };
}

export function urlStepToView(
  step: EtsyRecommendationUrlStep,
): EtsyRecommendationView {
  if (step === 'choose') {
    return 'choose';
  }
  return URL_STEP_TO_VIEW[step];
}

export function viewToUrlStep(view: EtsyRecommendationView): EtsyRecommendationUrlStep {
  return VIEW_TO_URL_STEP[view];
}

export function buildEtsyRecommendationHref(options: {
  view: EtsyRecommendationView;
  requestId?: string | null;
}): string {
  const step = viewToUrlStep(options.view);
  if (step === 'choose') {
    return ETSY_RECOMMENDATIONS_BASE_PATH;
  }

  const params = new URLSearchParams({ step });
  if (step === 'results' && options.requestId?.trim()) {
    params.set('requestId', options.requestId.trim());
  }

  return `${ETSY_RECOMMENDATIONS_BASE_PATH}?${params.toString()}`;
}
