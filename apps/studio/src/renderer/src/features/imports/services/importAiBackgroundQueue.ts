import { aiEnrichmentEnqueueService } from "../../ai-review/services/aiEnrichmentEnqueueService";
import { logPipelineEvent } from "../../../shared/utils/pipelineLog";

/**
 * Session-scoped sequential AI enqueue for Studio import.
 * Batch import pushes each design as soon as that file's pipeline succeeds
 * (while other files may still be uploading). Single import pushes on success.
 * Not gated on Processing-tab Auto advance.
 * Dedupes design ids and never fires concurrent enqueueAiEnrichment calls.
 */
const pendingDesignIds: string[] = [];
const seenDesignIds = new Set<string>();
let isPumpRunning = false;

export function enqueueImportedDesignsForBackgroundAi(designIds: readonly string[]): void {
  let added = 0;
  for (const rawId of designIds) {
    const designId = rawId.trim();
    if (!designId || seenDesignIds.has(designId)) {
      continue;
    }
    seenDesignIds.add(designId);
    pendingDesignIds.push(designId);
    added += 1;
  }

  if (added === 0) {
    return;
  }

  logPipelineEvent("import.ai_background.queued", {
    added,
    pending: pendingDesignIds.length,
  });

  void pumpBackgroundAiQueue();
}

async function pumpBackgroundAiQueue(): Promise<void> {
  if (isPumpRunning) {
    return;
  }

  isPumpRunning = true;
  try {
    while (pendingDesignIds.length > 0) {
      const designId = pendingDesignIds.shift();
      if (!designId) {
        continue;
      }

      try {
        await aiEnrichmentEnqueueService.enqueueForProcessing(designId);
        logPipelineEvent("import.ai_background.enqueued", { designId });
      } catch (error) {
        logPipelineEvent("import.ai_background.enqueue_failed", {
          designId,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  } finally {
    isPumpRunning = false;
    if (pendingDesignIds.length > 0) {
      void pumpBackgroundAiQueue();
    }
  }
}
