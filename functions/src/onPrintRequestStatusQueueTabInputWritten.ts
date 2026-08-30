import { onDocumentWritten } from "firebase-functions/v2/firestore";

import { recomputeAndPersistQueueTab } from "./lib/printRequestQueueTab";

/**
 * Keeps `queueTab` in sync when a print request's lifecycle `status` changes (for example
 * `active` -> `completed` on Internal Gang Sheet finish) without a matching allocation write.
 */
export const onPrintRequestStatusQueueTabInputWritten = onDocumentWritten(
  "printRequests/{printRequestId}",
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!after) {
      return;
    }

    if (before && after && before.status === after.status) {
      return;
    }

    await recomputeAndPersistQueueTab(event.params.printRequestId);
  },
);
