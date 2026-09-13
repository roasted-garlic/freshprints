import { onDocumentWritten } from "firebase-functions/v2/firestore";

import { refreshPortalProjectionsForStaffArtwork } from "./lib/portalPrintRequestItemProjectionSync";

/**
 * When a Staff Artwork library document changes, refresh attached Portal projections
 * so title/preview/pixels stay current without Portal reading staffArtworks.
 */
export const onStaffArtworkPortalProjectionRefreshWritten = onDocumentWritten(
  "staffArtworks/{staffArtworkId}",
  async (event) => {
    await refreshPortalProjectionsForStaffArtwork(event.params.staffArtworkId);
  },
);
