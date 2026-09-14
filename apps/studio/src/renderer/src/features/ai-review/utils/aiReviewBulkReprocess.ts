export interface AiReviewBulkReprocessFailure {
  designId: string;
  message: string;
}

export interface AiReviewBulkReprocessResult {
  attemptedIds: string[];
  successfulIds: string[];
  failures: AiReviewBulkReprocessFailure[];
  warnings: AiReviewBulkReprocessFailure[];
}

export interface AiReviewBulkReprocessProgress {
  /** 1-based index of the design currently starting (or just finished when phase is "finish"). */
  current: number;
  /** Finished count after this item when phase is "finish"; otherwise current - 1. */
  completed: number;
  total: number;
  designId: string;
  phase: "start" | "finish";
}

/**
 * Run the existing single-design operation serially. The caller owns eligibility and duplicate
 * guards; this helper only provides deterministic bounded orchestration and progress reporting.
 */
export async function runAiReviewBulkReprocess(input: {
  designIds: readonly string[];
  reprocessOne: (
    designId: string,
  ) => Promise<{ ok: true; warning?: string } | { ok: false; message: string }>;
  onProgress?: (progress: AiReviewBulkReprocessProgress) => void;
}): Promise<AiReviewBulkReprocessResult> {
  const attemptedIds = [...new Set(input.designIds)].filter(Boolean);
  const successfulIds: string[] = [];
  const failures: AiReviewBulkReprocessFailure[] = [];
  const warnings: AiReviewBulkReprocessFailure[] = [];

  for (let index = 0; index < attemptedIds.length; index += 1) {
    const designId = attemptedIds[index]!;
    const current = index + 1;
    input.onProgress?.({
      current,
      completed: index,
      total: attemptedIds.length,
      designId,
      phase: "start",
    });
    try {
      const result = await input.reprocessOne(designId);
      if (result.ok) {
        successfulIds.push(designId);
        if (result.warning) warnings.push({ designId, message: result.warning });
      } else {
        failures.push({ designId, message: result.message });
      }
    } catch (error) {
      failures.push({
        designId,
        message: error instanceof Error ? error.message : "Unable to reprocess design.",
      });
    }
    input.onProgress?.({
      current,
      completed: current,
      total: attemptedIds.length,
      designId,
      phase: "finish",
    });
  }

  return { attemptedIds, successfulIds, failures, warnings };
}
