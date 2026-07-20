/**
 * Prefer the list-backed working request id; fall back to the locally known
 * pending id while the list catches up after lazy create.
 */
export function resolveCurrentRequestReviewId(
  workingRequestId: string | null | undefined,
  pendingWorkingRequestId: string | null | undefined,
): string | null {
  const working = workingRequestId?.trim();
  if (working) {
    return working;
  }
  const pending = pendingWorkingRequestId?.trim();
  if (pending) {
    return pending;
  }
  return null;
}
