import type { SettledTaskResult } from "../../../packages/shared/src/utils/boundedConcurrencyQueue";

export interface ZipImageTaskInput {
  uploadId: string;
  entryName: string;
}

export interface ZipImageFileResult {
  uploadId: string;
  entryName: string;
  technicalStatus: "ready" | "failed";
  technicalFailureCode?: string | null;
  technicalFailureMessage?: string | null;
}

export interface ZipProcessingAggregation {
  fileResults: ZipImageFileResult[];
  readyCount: number;
  failedCount: number;
  /** Images whose task threw unexpectedly rather than returning a typed failure result. */
  unexpectedRejections: Array<{ image: ZipImageTaskInput; reason: unknown }>;
}

/**
 * Deterministically aggregates `readyCount`/`failedCount`/`fileResults` from a bounded-concurrency
 * batch's settled results, in `imagesToProcess` order — never from a running total mutated inside a
 * concurrently-executing task callback. A rejected task (an unexpected thrown error — the normal
 * failure path already returns a typed `technicalStatus: "failed"` result rather than throwing) is
 * folded in as a failed image so one bad entry never prevents the rest of the batch from being
 * reported correctly, matching pre-existing sequential-loop behavior.
 */
export function aggregateZipProcessingResults(
  imagesToProcess: readonly ZipImageTaskInput[],
  settled: ReadonlyArray<SettledTaskResult<ZipImageFileResult>>,
): ZipProcessingAggregation {
  const fileResults: ZipImageFileResult[] = [];
  const unexpectedRejections: ZipProcessingAggregation["unexpectedRejections"] = [];
  let readyCount = 0;
  let failedCount = 0;

  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      fileResults.push(outcome.value);
      if (outcome.value.technicalStatus === "ready") {
        readyCount += 1;
      } else {
        failedCount += 1;
      }
      continue;
    }

    const image = imagesToProcess[outcome.index];
    const message = outcome.reason instanceof Error ? outcome.reason.message : "Image processing failed.";
    failedCount += 1;
    fileResults.push({
      uploadId: image.uploadId,
      entryName: image.entryName,
      technicalStatus: "failed",
      technicalFailureCode: "processing_failed",
      technicalFailureMessage: message,
    });
    unexpectedRejections.push({ image, reason: outcome.reason });
  }

  return { fileResults, readyCount, failedCount, unexpectedRejections };
}
