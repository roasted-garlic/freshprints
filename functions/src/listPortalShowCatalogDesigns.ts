import { onCall } from "firebase-functions/v2/https";

import type {
  ListPortalShowCatalogDesignsRequest,
  ListPortalShowCatalogDesignsResponse,
} from "../../packages/shared/src/types/portal/listPortalShowCatalogDesigns.types";
import type { ShowProductionStatus } from "../../packages/shared/src/types/upcomingShow/upcomingShow.enums";

import { adminDb } from "./lib/admin";
import { failedPrecondition, internal, invalidArgument } from "./lib/errors";
import { listPublicCatalogDesignCardsForShow } from "./lib/portalShowCatalogDesigns";

function mapHttpsError(error: unknown): never {
  if (error instanceof Error && "code" in error) {
    throw error;
  }

  if (error instanceof Error) {
    throw internal(error.message);
  }

  throw internal("Unable to load show designs right now.");
}

function resolveProductionStatus(value: unknown): ShowProductionStatus {
  const allowed: ShowProductionStatus[] = [
    "open",
    "full",
    "printing",
    "fully_printed",
    "completed",
    "archived",
    "canceled",
  ];

  if (typeof value === "string" && allowed.includes(value as ShowProductionStatus)) {
    return value as ShowProductionStatus;
  }

  return "open";
}

/**
 * Public-safe catalog design gallery for a Portal-visible show.
 * No auth required; never returns customer-upload artwork or PII.
 */
export const listPortalShowCatalogDesigns = onCall(
  async (request): Promise<ListPortalShowCatalogDesignsResponse> => {
    try {
      const upcomingShowId =
        typeof (request.data as ListPortalShowCatalogDesignsRequest | undefined)?.upcomingShowId ===
        "string"
          ? (request.data as ListPortalShowCatalogDesignsRequest).upcomingShowId.trim()
          : "";

      if (!upcomingShowId) {
        throw invalidArgument("A show ID is required.");
      }

      const showSnap = await adminDb.collection("upcomingShows").doc(upcomingShowId).get();
      if (!showSnap.exists) {
        throw invalidArgument("Show not found.");
      }

      const showData = showSnap.data() ?? {};
      if (showData.isArchived === true || showData.source === "staff_gang_sheet") {
        throw failedPrecondition("This show is not available for public design browsing.");
      }

      const productionStatus = resolveProductionStatus(showData.productionStatus);
      if (productionStatus === "canceled" || productionStatus === "archived") {
        throw failedPrecondition("This show is not available for public design browsing.");
      }

      const scheduledStartAtField = showData.scheduledStartAt as { toDate: () => Date } | undefined;
      const scheduledStartAt = scheduledStartAtField
        ? scheduledStartAtField.toDate().toISOString()
        : null;

      const { cards } = await listPublicCatalogDesignCardsForShow(adminDb, upcomingShowId);

      return {
        showId: upcomingShowId,
        scheduledStartAt,
        productionStatus,
        designs: cards,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
