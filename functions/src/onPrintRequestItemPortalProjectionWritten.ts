import { onDocumentWritten } from "firebase-functions/v2/firestore";

import { writePortalPrintRequestItemProjection } from "./lib/portalPrintRequestItemProjectionSync";

/** Maintains the customer-safe request-item projection from canonical items. */
export const onPrintRequestItemPortalProjectionWritten = onDocumentWritten(
  "printRequestItems/{itemId}",
  async (event) => {
    const after = event.data?.after?.data();
    await writePortalPrintRequestItemProjection(
      event.params.itemId,
      after ? (after as Record<string, unknown>) : null,
    );
  },
);
