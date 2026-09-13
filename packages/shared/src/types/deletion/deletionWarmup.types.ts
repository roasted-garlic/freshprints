/**
 * Same-service Gen2 callable warmup (studio-delete-first-action-latency).
 *
 * Clients send `{ warmup: true }` to an *existing* deletion preview/mutate callable so the
 * matching Cloud Run service becomes warm. A separate generic ping Function cannot warm
 * unrelated Gen2 services.
 */

export interface DeletionCallableWarmupRequest {
  warmup: true;
}

export interface DeletionCallableWarmupResponse {
  warmed: true;
}

export function isDeletionCallableWarmupRequest(
  data: unknown,
): data is DeletionCallableWarmupRequest {
  return Boolean(
    data &&
      typeof data === "object" &&
      "warmup" in data &&
      (data as { warmup?: unknown }).warmup === true,
  );
}
