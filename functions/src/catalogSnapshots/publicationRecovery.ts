/**
 * Pure helpers for portal-catalog / catalog-reference publication recovery.
 * Keeps ADR-FP-120 debounce/lease semantics while preventing a failed or lease-busy
 * pass from permanently abandoning a higher requestedGeneration (tag-removal incident).
 */

/** Default catch-up pass limit (catalog-reference + admin drain). Portal automatic wakes use 1. */
export const PUBLICATION_PASS_LIMIT = 3;
/** Amendment 9 P4: at most one successful full portal publication per automatic wake. */
export const PORTAL_PUBLICATION_PASS_LIMIT = 1;
export const LEASE_BUSY_RETRY_DELAY_MS = 5_000;
export const TRANSIENT_STORAGE_RETRY_LIMIT = 3;
export const TRANSIENT_STORAGE_RETRY_BASE_DELAY_MS = 400;

export function resolveNextEligiblePublishAtMs(
  data: { nextEligiblePublishAt?: unknown },
): number | null {
  const raw = data.nextEligiblePublishAt;
  if (raw == null) return null;
  if (typeof raw === "object" && typeof (raw as { toMillis?: unknown }).toMillis === "function") {
    return (raw as { toMillis: () => number }).toMillis();
  }
  return null;
}

/**
 * Missing/null nextEligiblePublishAt ⇒ eligible immediately (additive field compatibility).
 */
export function isPortalPublicationEligible(
  data: { nextEligiblePublishAt?: unknown },
  nowMs: number,
): boolean {
  const eligibleAt = resolveNextEligiblePublishAtMs(data);
  return eligibleAt === null || nowMs >= eligibleAt;
}

export type PublicationPassRetryKind = "lease-busy" | "transient" | "fatal";

export function isTransientPublicationStorageError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as {
    name?: unknown;
    message?: unknown;
    code?: unknown;
    status?: unknown;
  };
  const name = typeof err.name === "string" ? err.name : "";
  const message = typeof err.message === "string" ? err.message : String(error);
  const code = err.code;
  const status = err.status;

  if (name === "FetchError") return true;
  if (/FetchError/i.test(message)) return true;
  if (/ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|socket hang up|network|fetch failed|temporarily unavailable/i.test(message)) {
    return true;
  }
  if (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "EAI_AGAIN" ||
    code === "ENOTFOUND" ||
    code === 408 ||
    code === 429 ||
    code === 500 ||
    code === 502 ||
    code === 503 ||
    code === 504
  ) {
    return true;
  }
  if (status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  return false;
}

export function publicationNeedsCatchUp(
  requestedGeneration: unknown,
  publishedGeneration: number,
): boolean {
  return typeof requestedGeneration === "number" && requestedGeneration > publishedGeneration;
}

export function shouldRetryPublicationPass(error: unknown): PublicationPassRetryKind {
  if (error instanceof Error && error.message === "snapshot-publication-lease-active") {
    return "lease-busy";
  }
  // Eligibility deferral is not a same-wake retry — catch-up rethrows for W2 wake.
  if (error instanceof Error && error.message === "snapshot-publication-not-yet-eligible") {
    return "fatal";
  }
  if (isTransientPublicationStorageError(error)) return "transient";
  return "fatal";
}

export async function withTransientStorageRetry<T>(
  operation: () => Promise<T>,
  options?: {
    retryLimit?: number;
    baseDelayMs?: number;
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<T> {
  const retryLimit = options?.retryLimit ?? TRANSIENT_STORAGE_RETRY_LIMIT;
  const baseDelayMs = options?.baseDelayMs ?? TRANSIENT_STORAGE_RETRY_BASE_DELAY_MS;
  const sleep =
    options?.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  let lastError: unknown;
  for (let attempt = 0; attempt < retryLimit; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const isLast = attempt >= retryLimit - 1;
      if (!isTransientPublicationStorageError(error) || isLast) {
        throw error;
      }
      await sleep(baseDelayMs * (attempt + 1));
    }
  }
  throw lastError;
}
