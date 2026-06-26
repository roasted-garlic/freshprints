import type { Unsubscribe } from "firebase/firestore";

import type { Design } from "../../designs/types/design.types";
import { designDocumentSubscriptionService } from "../../designs/services/designDocumentSubscriptionService";
import { isAiProcessingTerminal } from "../utils/aiProcessingQueueEligibility";

const TERMINAL_WAIT_TIMEOUT_MS = 10 * 60 * 1000;

export function waitForAiProcessingTerminal(designId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let unsubscribe: Unsubscribe | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function cleanup() {
      unsubscribe?.();
      unsubscribe = null;

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for AI processing to finish."));
    }, TERMINAL_WAIT_TIMEOUT_MS);

    unsubscribe = designDocumentSubscriptionService.subscribeToDesign(
      designId,
      (design: Design | null) => {
        if (!design) {
          return;
        }

        if (isAiProcessingTerminal(design)) {
          cleanup();
          resolve();
        }
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
  });
}
