export type EtsyRecommendationView =
  | 'choose'
  | 'screen1'
  | 'screen2'
  | 'screen3'
  | 'review'
  | 'results';

export const ETSY_RECOMMENDATIONS_BASE_PATH = '/custom-designs';

/** Active Custom Designs option flows. Reserved: `ai`, `assisted`. */
export type EtsyRecommendationFlow = 'find';

export type EtsyRecommendationUrlStep =
  | 'choose'
  | 'subject'
  | 'style'
  | 'wording'
  | 'review'
  | 'results';

const FIND_STEPS = new Set<Exclude<EtsyRecommendationUrlStep, 'choose'>>([
  'subject',
  'style',
  'wording',
  'review',
  'results',
]);

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
  flow: EtsyRecommendationFlow | null;
  step: EtsyRecommendationUrlStep;
  requestId: string | null;
  /** True when the location used legacy `?step=` under `/custom-designs`. */
  isLegacyQuery: boolean;
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname || ETSY_RECOMMENDATIONS_BASE_PATH;
}

function parseLegacyQueryStep(
  searchParams: URLSearchParams,
): Exclude<EtsyRecommendationUrlStep, 'choose'> | null {
  const stepRaw = searchParams.get('step')?.trim().toLowerCase();
  if (!stepRaw || stepRaw === 'choose') {
    return null;
  }
  if (
    stepRaw === 'subject' ||
    stepRaw === 'style' ||
    stepRaw === 'wording' ||
    stepRaw === 'review' ||
    stepRaw === 'results'
  ) {
    return stepRaw;
  }
  return null;
}

/**
 * Parse Custom Designs location from pathname + search.
 * Canonical: `/custom-designs` or `/custom-designs/find/{step}`.
 * Legacy: `/custom-designs?step=subject` (and results + requestId).
 */
export function parseEtsyRecommendationLocation(
  pathname: string,
  searchParams: URLSearchParams,
): ParsedEtsyRecommendationUrl {
  const path = normalizePathname(pathname);
  const requestId = searchParams.get('requestId')?.trim() || null;

  if (path === ETSY_RECOMMENDATIONS_BASE_PATH) {
    const legacyStep = parseLegacyQueryStep(searchParams);
    if (legacyStep) {
      return {
        flow: 'find',
        step: legacyStep,
        requestId: legacyStep === 'results' ? requestId : null,
        isLegacyQuery: true,
      };
    }
    return { flow: null, step: 'choose', requestId: null, isLegacyQuery: false };
  }

  const prefix = `${ETSY_RECOMMENDATIONS_BASE_PATH}/`;
  if (!path.startsWith(prefix)) {
    return { flow: null, step: 'choose', requestId: null, isLegacyQuery: false };
  }

  const segments = path.slice(prefix.length).split('/').filter(Boolean);
  const flowRaw = segments[0]?.toLowerCase();
  const stepRaw = segments[1]?.toLowerCase();

  if (flowRaw !== 'find') {
    // Unknown / reserved flows (ai, assisted, …) → choose for now.
    return { flow: null, step: 'choose', requestId: null, isLegacyQuery: false };
  }

  if (!stepRaw || !FIND_STEPS.has(stepRaw as Exclude<EtsyRecommendationUrlStep, 'choose'>)) {
    return { flow: null, step: 'choose', requestId: null, isLegacyQuery: false };
  }

  const step = stepRaw as Exclude<EtsyRecommendationUrlStep, 'choose'>;
  return {
    flow: 'find',
    step,
    requestId: step === 'results' ? requestId : null,
    isLegacyQuery: false,
  };
}

/** @deprecated Prefer parseEtsyRecommendationLocation(pathname, searchParams). */
export function parseEtsyRecommendationUrl(
  searchParams: URLSearchParams,
): ParsedEtsyRecommendationUrl {
  return parseEtsyRecommendationLocation(ETSY_RECOMMENDATIONS_BASE_PATH, searchParams);
}

export function urlStepToView(step: EtsyRecommendationUrlStep): EtsyRecommendationView {
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

  const path = `${ETSY_RECOMMENDATIONS_BASE_PATH}/find/${step}`;
  if (step === 'results' && options.requestId?.trim()) {
    const params = new URLSearchParams({ requestId: options.requestId.trim() });
    return `${path}?${params.toString()}`;
  }
  return path;
}
