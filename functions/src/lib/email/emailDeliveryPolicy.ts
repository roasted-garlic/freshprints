export const EMAIL_DELIVERY_MAX_ATTEMPTS = 5;

export function canClaimEmailJob(input: {
  status: unknown;
  attemptCount: unknown;
  leaseExpiresAtMs?: number;
  nowMs: number;
}): boolean {
  const attempts = Number.isInteger(input.attemptCount) ? Number(input.attemptCount) : 0;
  if (attempts >= EMAIL_DELIVERY_MAX_ATTEMPTS) {
    return false;
  }
  if (input.status === "pending") {
    return true;
  }
  return input.status === "sending" && (input.leaseExpiresAtMs ?? 0) <= input.nowMs;
}

export function shouldRetryEmailFailure(transient: boolean, attemptCount: number): boolean {
  return transient && attemptCount < EMAIL_DELIVERY_MAX_ATTEMPTS;
}
