import { FirebaseError } from 'firebase/app';

import { PRINT_REQUEST_QUOTA_ERROR_CODES } from '@fresh-prints/shared/constants/printRequest/printRequestQuotaErrorCodes.constants';
import type { PrintRequestQuotaErrorDetails } from '@fresh-prints/shared/constants/printRequest/printRequestQuotaErrorCodes.constants';
import { formatShowCustomerLimitUserMessage } from '@fresh-prints/shared/utils/printRequestQuotaUserCopy';
import { formatWorkingRequestFullUserMessage } from '@fresh-prints/shared/utils/printRequestWorkingRequestMax';

import { portalAuthService } from '../../auth/services/authService';

function readQuotaDetails(error: FirebaseError): PrintRequestQuotaErrorDetails | null {
  const details = (error as FirebaseError & { details?: unknown }).details;
  if (!details || typeof details !== 'object') {
    return null;
  }
  const code = (details as { code?: unknown }).code;
  if (typeof code !== 'string') {
    return null;
  }
  const known = Object.values(PRINT_REQUEST_QUOTA_ERROR_CODES) as string[];
  if (!known.includes(code)) {
    return null;
  }
  const limit = (details as { limit?: unknown }).limit;
  const cap = (details as { cap?: unknown }).cap;
  const remaining = (details as { remaining?: unknown }).remaining;
  return {
    code: code as PrintRequestQuotaErrorDetails['code'],
    ...(typeof limit === 'number' && Number.isFinite(limit) ? { limit } : {}),
    ...(typeof cap === 'number' && Number.isFinite(cap) ? { cap } : {}),
    ...(typeof remaining === 'number' && Number.isFinite(remaining) ? { remaining } : {}),
  };
}

/** Map Firebase callable errors to customer-facing messages. */
export function mapPortalPrintRequestCallableError(error: unknown): Error {
  if (!(error instanceof FirebaseError)) {
    return new Error(
      error instanceof Error ? error.message : portalAuthService.getCallableErrorMessage(error),
    );
  }

  const details = readQuotaDetails(error);
  const fallback = portalAuthService.getCallableErrorMessage(error);

  if (details?.code === PRINT_REQUEST_QUOTA_ERROR_CODES.WORKING_REQUEST_PRINT_LIMIT) {
    const cap = details.cap ?? details.limit;
    if (typeof cap === 'number' && Number.isFinite(cap) && cap > 0) {
      return new Error(formatWorkingRequestFullUserMessage(cap));
    }
    return new Error(fallback);
  }

  if (details?.code === PRINT_REQUEST_QUOTA_ERROR_CODES.SHOW_CUSTOMER_LIMIT) {
    const cap = details.cap;
    if (typeof cap === 'number' && Number.isFinite(cap) && cap > 0) {
      return new Error(formatShowCustomerLimitUserMessage(cap));
    }
    return new Error(fallback);
  }

  if (
    details?.code === PRINT_REQUEST_QUOTA_ERROR_CODES.SHOW_CAPACITY ||
    details?.code === PRINT_REQUEST_QUOTA_ERROR_CODES.SHOW_ALLOCATION_BLOCKED ||
    details?.code === PRINT_REQUEST_QUOTA_ERROR_CODES.SHOW_QUEUE_CUTOFF
  ) {
    return new Error(fallback);
  }

  return new Error(fallback);
}
