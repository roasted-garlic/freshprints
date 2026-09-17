/**
 * Whether a locally cached "ensured" Working request id is still safe to mutate against.
 *
 * After Add-to-Show the request becomes `active` and leaves the active-editable set. Returning
 * that stale id causes `Request … is not in a continuable state` until a hard refresh.
 * Trust the cache only while the live working request matches, the id is still active-editable,
 * or a create is still in flight / pending list lag.
 */
export function shouldTrustEnsuredWorkingRequestId(input: {
  ensuredId: string | null | undefined;
  workingRequestId: string | null | undefined;
  pendingWorkingRequestId: string | null | undefined;
  activeEditableRequestIds: readonly string[];
  hasInFlightCreate: boolean;
}): boolean {
  const ensuredId = input.ensuredId?.trim() || null;
  if (!ensuredId) {
    return false;
  }

  const workingRequestId = input.workingRequestId?.trim() || null;
  if (workingRequestId === ensuredId) {
    return true;
  }

  // Live Working request already moved on — never reuse a departed id.
  if (workingRequestId && workingRequestId !== ensuredId) {
    return false;
  }

  const pendingWorkingRequestId = input.pendingWorkingRequestId?.trim() || null;
  if (pendingWorkingRequestId === ensuredId) {
    return true;
  }

  if (input.activeEditableRequestIds.includes(ensuredId)) {
    return true;
  }

  // Create is still running (ensured may be set just before pending state commits).
  return input.hasInFlightCreate;
}

export function isPortalPrintRequestNotContinuableError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  return /not in a continuable state/i.test(message);
}
