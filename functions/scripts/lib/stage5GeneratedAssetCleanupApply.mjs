/**
 * Stage 5 APPLY helpers — retry / batch / transient classification (pure + injectable I/O).
 *
 * No Firebase imports. Used by `stage5-generated-asset-cleanup.mjs` and unit tests.
 */

import { assertAllowedStoragePath } from "./stage5GeneratedAssetCleanupGuard.mjs";

/** Default APPLY concurrency — high fan-out (e.g. 40) correlates with GCS internal errors. */
export const STAGE5_APPLY_CONCURRENCY = 8;

/** Max attempts per object (initial try + retries). */
export const STAGE5_DELETE_MAX_ATTEMPTS = 8;

export const STAGE5_RETRY_BASE_DELAY_MS = 300;
export const STAGE5_RETRY_MAX_DELAY_MS = 20_000;

/**
 * Best-effort classification of transient GCS / network failures worth retrying.
 * @param {unknown} err
 * @returns {boolean}
 */
export function isTransientStorageError(err) {
  if (err == null) return false;

  const code = err.code ?? err.statusCode ?? err.status;
  const numeric =
    typeof code === "number"
      ? code
      : typeof code === "string" && /^\d+$/.test(code)
        ? Number(code)
        : null;

  if (numeric === 408 || numeric === 429 || numeric === 500 || numeric === 502 || numeric === 503 || numeric === 504) {
    return true;
  }

  // gRPC / Google API status codes commonly seen on Storage
  const codeStr = String(code ?? "").toUpperCase();
  if (
    codeStr === "RESOURCE_EXHAUSTED" ||
    codeStr === "UNAVAILABLE" ||
    codeStr === "INTERNAL" ||
    codeStr === "ABORTED" ||
    codeStr === "DEADLINE_EXCEEDED" ||
    codeStr === "UNKNOWN"
  ) {
    return true;
  }
  if (numeric === 10 || numeric === 13 || numeric === 14 || numeric === 4 || numeric === 8) {
    // ABORTED, INTERNAL, UNAVAILABLE, DEADLINE_EXCEEDED, RESOURCE_EXHAUSTED
    return true;
  }

  const msg = String(err.message ?? err).toLowerCase();
  if (msg.includes("internal error") && msg.includes("try again")) return true;
  if (msg.includes("we encountered an internal error")) return true;
  if (msg.includes("rate limit") || msg.includes("too many requests") || msg.includes("quota")) return true;
  if (msg.includes("econnreset") || msg.includes("etimedout") || msg.includes("socket hang up")) return true;
  if (msg.includes("unavailable") || msg.includes("deadline exceeded")) return true;
  if (msg.includes("temporarily unavailable") || msg.includes("please try again")) return true;

  return false;
}

/**
 * @param {number} ms
 * @param {(ms: number) => Promise<void>} [sleep]
 */
export async function sleepMs(ms, sleep = (n) => new Promise((r) => setTimeout(r, n))) {
  await sleep(ms);
}

/**
 * Exponential backoff with jitter.
 * @param {number} attempt 1-based failed attempt index
 */
export function computeBackoffMs(
  attempt,
  { baseDelayMs = STAGE5_RETRY_BASE_DELAY_MS, maxDelayMs = STAGE5_RETRY_MAX_DELAY_MS, random = Math.random } = {},
) {
  const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(random() * Math.min(250, exp * 0.2));
  return Math.min(maxDelayMs, exp + jitter);
}

/**
 * @template T
 * @param {() => Promise<T>} fn
 * @param {object} [opts]
 */
export async function withTransientRetry(
  fn,
  {
    maxAttempts = STAGE5_DELETE_MAX_ATTEMPTS,
    isTransient = isTransientStorageError,
    sleep = (n) => new Promise((r) => setTimeout(r, n)),
    random = Math.random,
    onRetry,
  } = {},
) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const transient = isTransient(err);
      if (!transient || attempt === maxAttempts) {
        throw err;
      }
      const delay = computeBackoffMs(attempt, { random });
      onRetry?.({ attempt, delayMs: delay, error: err });
      await sleepMs(delay, sleep);
    }
  }
  throw lastErr;
}

/**
 * Delete allowlisted paths in bounded concurrent batches with per-object retry.
 * Idempotent when deleteOne treats missing objects as success.
 *
 * @param {object} opts
 * @param {string[]} opts.paths
 * @param {(path: string) => Promise<void>} opts.deleteOne
 * @param {(path: string) => string} [opts.assertPath]
 * @param {number} [opts.concurrency]
 * @param {number} [opts.maxAttempts]
 * @param {(info: { completed: number, total: number, batchIndex: number, batchCount: number }) => void} [opts.onProgress]
 * @param {(info: { path: string, attempt: number, delayMs: number, error: unknown }) => void} [opts.onRetry]
 * @param {(ms: number) => Promise<void>} [opts.sleep]
 */
export async function deleteAllowlistedPathsInBatches({
  paths,
  deleteOne,
  assertPath = assertAllowedStoragePath,
  concurrency = STAGE5_APPLY_CONCURRENCY,
  maxAttempts = STAGE5_DELETE_MAX_ATTEMPTS,
  onProgress,
  onRetry,
  sleep,
  isTransient = isTransientStorageError,
  random = Math.random,
}) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error(`Invalid concurrency: ${concurrency}`);
  }

  const normalized = paths.map((p) => assertPath(p));
  const total = normalized.length;
  let completed = 0;
  /** @type {Array<{ path: string, error: unknown }>} */
  const permanentFailures = [];

  const batchCount = total === 0 ? 0 : Math.ceil(total / concurrency);

  for (let i = 0; i < normalized.length; i += concurrency) {
    const batchIndex = Math.floor(i / concurrency) + 1;
    const slice = normalized.slice(i, i + concurrency);

    const settled = await Promise.all(
      slice.map(async (path) => {
        try {
          await withTransientRetry(() => deleteOne(path), {
            maxAttempts,
            isTransient,
            sleep,
            random,
            onRetry: (info) => onRetry?.({ path, ...info }),
          });
          return { path, ok: true };
        } catch (error) {
          return { path, ok: false, error };
        }
      }),
    );

    for (const row of settled) {
      if (row.ok) {
        completed += 1;
      } else {
        permanentFailures.push({ path: row.path, error: row.error });
      }
    }

    onProgress?.({
      completed: completed + permanentFailures.length,
      succeeded: completed,
      failed: permanentFailures.length,
      total,
      batchIndex,
      batchCount,
    });
  }

  return {
    total,
    succeeded: completed,
    failed: permanentFailures,
  };
}

/**
 * Summarize remaining inventory after APPLY (for verification / resume messaging).
 * @param {Array<{ prefix: string, objectCount: number }>} storageByPrefix
 * @param {number} firestoreDocCount
 */
export function buildApplyVerificationSummary(storageByPrefix, firestoreDocCount) {
  const remainingObjects = storageByPrefix.reduce((sum, row) => sum + row.objectCount, 0);
  return {
    remainingStorageObjects: remainingObjects,
    remainingByPrefix: storageByPrefix.map((row) => ({
      prefix: row.prefix,
      objectCount: row.objectCount,
    })),
    remainingFirestoreDocs: firestoreDocCount,
    storageClean: remainingObjects === 0,
    firestoreClean: firestoreDocCount === 0,
    fullyClean: remainingObjects === 0 && firestoreDocCount === 0,
  };
}
