import type { DeletionCallableWarmupResponse } from "@fresh-prints/shared/types/deletion/deletionWarmup.types";

import { callTracedFunction } from "../../../config/tracedCallable";

/**
 * Same-service Gen2 warmup: invokes `{ warmup: true }` on the *named* callable so that Cloud Run
 * service becomes warm. Never introduces a standalone ping Function.
 */
export async function warmDeletionCallable(callableName: string): Promise<boolean> {
  try {
    const result = await callTracedFunction<
      { warmup: true },
      DeletionCallableWarmupResponse
    >(callableName, {
      source: `deletionCallableWarmup.${callableName}`,
      logicalOperation: "deletion-callable-warmup",
    })({ warmup: true });
    return result?.warmed === true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.info("[deletion-warmup] skipped/failed", {
        callableName,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
    return false;
  }
}

/** Fire-and-forget; never rejects. */
export function warmDeletionCallableBackground(callableName: string): void {
  void warmDeletionCallable(callableName);
}
