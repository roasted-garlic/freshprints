import {
  ASSISTED_CREATION_WIZARD_STEPS,
  type AssistedCreationWizardStepId,
} from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';

export const ASSISTED_CREATION_BASE_PATH = '/custom-designs';

const STEP_IDS = new Set<string>(ASSISTED_CREATION_WIZARD_STEPS.map((step) => step.id));

export type AssistedCreationUrlMode = 'wizard' | 'status';

export interface ParsedAssistedCreationUrl {
  isAssisted: boolean;
  mode: AssistedCreationUrlMode;
  stepId: AssistedCreationWizardStepId | null;
  /** Path-based `/custom-designs/assisted/...` should rewrite to query params. */
  isLegacyPath: boolean;
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname || ASSISTED_CREATION_BASE_PATH;
}

export function parseAssistedCreationLocation(
  pathname: string,
  searchParams: URLSearchParams,
): ParsedAssistedCreationUrl {
  const path = normalizePathname(pathname);
  const flow = searchParams.get('flow')?.trim().toLowerCase();
  const stepRaw = searchParams.get('step')?.trim().toLowerCase() ?? '';

  if (flow === 'assisted') {
    if (!stepRaw || stepRaw === 'status') {
      return { isAssisted: true, mode: 'status', stepId: null, isLegacyPath: false };
    }
    if (STEP_IDS.has(stepRaw)) {
      return {
        isAssisted: true,
        mode: 'wizard',
        stepId: stepRaw as AssistedCreationWizardStepId,
        isLegacyPath: false,
      };
    }
    return {
      isAssisted: true,
      mode: 'wizard',
      stepId: 'description',
      isLegacyPath: false,
    };
  }

  const prefix = `${ASSISTED_CREATION_BASE_PATH}/assisted`;
  if (path === prefix || path.startsWith(`${prefix}/`)) {
    const rest = path === prefix ? 'status' : path.slice(prefix.length + 1).split('/')[0] ?? 'status';
    const legacyStep = rest.toLowerCase();
    if (!legacyStep || legacyStep === 'status') {
      return { isAssisted: true, mode: 'status', stepId: null, isLegacyPath: true };
    }
    if (STEP_IDS.has(legacyStep)) {
      return {
        isAssisted: true,
        mode: 'wizard',
        stepId: legacyStep as AssistedCreationWizardStepId,
        isLegacyPath: true,
      };
    }
    return {
      isAssisted: true,
      mode: 'wizard',
      stepId: 'description',
      isLegacyPath: true,
    };
  }

  return { isAssisted: false, mode: 'status', stepId: null, isLegacyPath: false };
}

export function isAssistedCreationLocation(
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  return parseAssistedCreationLocation(pathname, searchParams).isAssisted;
}

export function buildAssistedCreationHref(options: {
  mode: AssistedCreationUrlMode;
  stepId?: AssistedCreationWizardStepId | null;
}): string {
  if (options.mode === 'status') {
    return `${ASSISTED_CREATION_BASE_PATH}?flow=assisted&step=status`;
  }
  const stepId = options.stepId ?? 'description';
  return `${ASSISTED_CREATION_BASE_PATH}?flow=assisted&step=${stepId}`;
}

/** Read assisted step from the live browser URL (refresh-safe). */
export function readAssistedCreationStepFromWindow(): AssistedCreationWizardStepId | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const parsed = parseAssistedCreationLocation(
    window.location.pathname,
    new URLSearchParams(window.location.search),
  );
  if (!parsed.isAssisted || parsed.mode !== 'wizard') {
    return null;
  }
  return parsed.stepId;
}
