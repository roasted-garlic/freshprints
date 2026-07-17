export type EtsyRecommendationView =
  | 'choose'
  | 'screen1'
  | 'screen2'
  | 'screen3'
  | 'review'
  | 'results';

export const ETSY_RECOMMENDATIONS_BASE_PATH = '/custom-designs';

/** Active Custom Designs option flows. */
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
  /**
   * True when the location used path segments (`/custom-designs/find/...`)
   * or omitted `flow=find` and should be rewritten to the canonical query form.
   */
  isLegacyPath: boolean;
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname || ETSY_RECOMMENDATIONS_BASE_PATH;
}

function parseQueryStep(
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
 * Parse Custom Designs Find location from pathname + search.
 * Canonical: `/custom-designs?flow=find&step=subject` (+ `requestId` for results).
 * Legacy: `/custom-designs/find/{step}` or `/custom-designs?step=subject` without flow.
 */
export function parseEtsyRecommendationLocation(
  pathname: string,
  searchParams: URLSearchParams,
): ParsedEtsyRecommendationUrl {
  const path = normalizePathname(pathname);
  const requestId = searchParams.get('requestId')?.trim() || null;
  const flowParam = searchParams.get('flow')?.trim().toLowerCase();

  if (flowParam === 'assisted' || flowParam === 'ai') {
    return { flow: null, step: 'choose', requestId: null, isLegacyPath: false };
  }

  if (path === ETSY_RECOMMENDATIONS_BASE_PATH) {
    const queryStep = parseQueryStep(searchParams);
    if (queryStep) {
      const hasFindFlow = flowParam === 'find';
      return {
        flow: 'find',
        step: queryStep,
        requestId: queryStep === 'results' ? requestId : null,
        // Rewrite bare `?step=` (no flow) to `?flow=find&step=`.
        isLegacyPath: !hasFindFlow,
      };
    }
    return { flow: null, step: 'choose', requestId: null, isLegacyPath: false };
  }

  const prefix = `${ETSY_RECOMMENDATIONS_BASE_PATH}/`;
  if (!path.startsWith(prefix)) {
    return { flow: null, step: 'choose', requestId: null, isLegacyPath: false };
  }

  const segments = path.slice(prefix.length).split('/').filter(Boolean);
  const flowRaw = segments[0]?.toLowerCase();
  const stepRaw = segments[1]?.toLowerCase();

  if (flowRaw !== 'find') {
    return { flow: null, step: 'choose', requestId: null, isLegacyPath: false };
  }

  if (!stepRaw || !FIND_STEPS.has(stepRaw as Exclude<EtsyRecommendationUrlStep, 'choose'>)) {
    return { flow: null, step: 'choose', requestId: null, isLegacyPath: true };
  }

  const step = stepRaw as Exclude<EtsyRecommendationUrlStep, 'choose'>;
  return {
    flow: 'find',
    step,
    requestId: step === 'results' ? requestId : null,
    isLegacyPath: true,
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

/** Canonical Find URLs: `/custom-designs?flow=find&step=…`. */
export function buildEtsyRecommendationHref(options: {
  view: EtsyRecommendationView;
  requestId?: string | null;
}): string {
  const step = viewToUrlStep(options.view);
  if (step === 'choose') {
    return ETSY_RECOMMENDATIONS_BASE_PATH;
  }

  const params = new URLSearchParams({ flow: 'find', step });
  if (step === 'results' && options.requestId?.trim()) {
    params.set('requestId', options.requestId.trim());
  }
  return `${ETSY_RECOMMENDATIONS_BASE_PATH}?${params.toString()}`;
}
