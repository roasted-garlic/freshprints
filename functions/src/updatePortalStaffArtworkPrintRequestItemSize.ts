import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { resolveActiveArtworkPixelDimensions } from "../../packages/shared/src/utils/interactiveArtworkEnhance";
import {
  formatPrintRequestItemSizeLabel,
  requireSavablePrintRequestItemSize,
} from "../../packages/shared/src/utils/printRequestItemSizing";
import { resolvePrintRequestItemSourceType } from "../../packages/shared/src/utils/printRequestItemSource";
import { adminDb } from "./lib/admin";
import { failedPrecondition, internal, invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import { requirePortalCustomer } from "./lib/portalCustomer";
import { assertPortalMaintenanceAllowsCustomerMutation } from "./lib/portalMaintenance";
import { assertPortalActiveEditableRequestData } from "./lib/portalContinuableParking";

export interface UpdatePortalStaffArtworkPrintRequestItemSizeRequest {
  printRequestId: string;
  itemId: string;
  printWidthInches: number;
  printHeightInches: number;
  standardSizePresetKey?: string | null;
}

export interface UpdatePortalStaffArtworkPrintRequestItemSizeResponse {
  printRequestId: string;
  itemId: string;
  printWidthInches: number;
  printHeightInches: number;
  sizeLabel: string;
  standardSizePresetKey?: string;
}

export const updatePortalStaffArtworkPrintRequestItemSize = onCall(
  async (request): Promise<UpdatePortalStaffArtworkPrintRequestItemSizeResponse> => {
    if (!request.auth?.uid) throw unauthenticated();
    try {
      const portalCustomer = await requirePortalCustomer(request.auth.uid);
      await assertPortalMaintenanceAllowsCustomerMutation(request.auth.uid);
      const data = request.data as Partial<UpdatePortalStaffArtworkPrintRequestItemSizeRequest>;
      const printRequestId = typeof data?.printRequestId === "string" ? data.printRequestId.trim() : "";
      const itemId = typeof data?.itemId === "string" ? data.itemId.trim() : "";
      const width = Number(data?.printWidthInches);
      const height = Number(data?.printHeightInches);
      if (!printRequestId || !itemId) throw invalidArgument("printRequestId and itemId are required.");
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        throw invalidArgument("Requested print size must be greater than 0 inches.");
      }
      const presetWasProvided = Object.prototype.hasOwnProperty.call(data ?? {}, "standardSizePresetKey");
      const requestedPreset = data?.standardSizePresetKey == null ? undefined : String(data.standardSizePresetKey).trim() || undefined;
      let response!: UpdatePortalStaffArtworkPrintRequestItemSizeResponse;
      await adminDb.runTransaction(async (tx) => {
        const requestRef = adminDb.collection("printRequests").doc(printRequestId);
        const itemRef = adminDb.collection("printRequestItems").doc(itemId);
        const requestSnap = await tx.get(requestRef);
        const itemSnap = await tx.get(itemRef);
        if (!requestSnap.exists) throw invalidArgument("Print request not found.");
        if (!itemSnap.exists) throw invalidArgument("Print request item not found.");
        const requestData = requestSnap.data() ?? {};
        const itemData = itemSnap.data() ?? {};
        const staffArtworkId = typeof itemData.staffArtworkId === "string" ? itemData.staffArtworkId.trim() : "";
        const itemSourceType = resolvePrintRequestItemSourceType({
          sourceType:
            itemData.sourceType === "customer_upload" ||
            itemData.sourceType === "staff_artwork" ||
            itemData.sourceType === "catalog_design"
              ? itemData.sourceType
              : undefined,
          designId: typeof itemData.designId === "string" ? itemData.designId : undefined,
          customerUploadId: typeof itemData.customerUploadId === "string" ? itemData.customerUploadId : undefined,
          staffArtworkId,
        });
        assertPortalActiveEditableRequestData(requestData, printRequestId);
        if (requestData.customerId !== portalCustomer.customerId) throw permissionDenied("You do not own this print request.");
        if (requestData.requestOrigin !== "portal_customer" || requestData.isInternal === true) throw failedPrecondition("This request cannot be edited from the portal.");
        if (requestData.status !== "draft" && requestData.status !== "editing") throw failedPrecondition("This print request can no longer be edited.");
        if (itemData.printRequestId !== printRequestId || itemSourceType !== "staff_artwork" || !staffArtworkId) {
          throw failedPrecondition("This item is not Staff Artwork.");
        }
        const artworkSnap = await tx.get(adminDb.collection("staffArtworks").doc(staffArtworkId));
        if (!artworkSnap.exists) throw failedPrecondition("Staff Artwork is no longer available.");
        const artwork = artworkSnap.data() ?? {};
        if (artwork.status !== "ready" && artwork.status !== "archived") throw failedPrecondition("Staff Artwork is still processing.");
        const processing = artwork.processing && typeof artwork.processing === "object" ? artwork.processing as Record<string, unknown> : {};
        const baselineWidth = Number(processing.widthPx);
        const baselineHeight = Number(processing.heightPx);
        if (!Number.isFinite(baselineWidth) || baselineWidth <= 0 || !Number.isFinite(baselineHeight) || baselineHeight <= 0) {
          throw failedPrecondition("Staff Artwork pixel dimensions are required to validate requested size.");
        }
        const active = resolveActiveArtworkPixelDimensions({
          artworkEnhanceMode: itemData.artworkEnhanceMode,
          baselineWidthPx: baselineWidth,
          baselineHeightPx: baselineHeight,
          enhancedWidthPx: typeof artwork.interactiveEnhancedWidthPx === "number" ? artwork.interactiveEnhancedWidthPx : null,
          enhancedHeightPx: typeof artwork.interactiveEnhancedHeightPx === "number" ? artwork.interactiveEnhancedHeightPx : null,
        });
        if (!active) throw failedPrecondition("Enhanced artwork pixel dimensions are required while Upscale is on.");
        try {
          requireSavablePrintRequestItemSize({ pixelWidth: active.widthPx, pixelHeight: active.heightPx, printWidthInches: width, printHeightInches: height });
        } catch (error) {
          throw failedPrecondition(error instanceof Error ? error.message : "Requested print size is not available.");
        }
        const preset = presetWasProvided ? requestedPreset : (typeof itemData.standardSizePresetKey === "string" ? itemData.standardSizePresetKey : undefined);
        const sizeLabel = formatPrintRequestItemSizeLabel(width, height);
        tx.update(itemRef, {
          printWidthInches: width,
          printHeightInches: height,
          sizeLabel,
          ...(presetWasProvided ? (preset ? { standardSizePresetKey: preset } : { standardSizePresetKey: FieldValue.delete() }) : {}),
          updatedAt: FieldValue.serverTimestamp(),
        });
        response = { printRequestId, itemId, printWidthInches: width, printHeightInches: height, sizeLabel, ...(preset ? { standardSizePresetKey: preset } : {}) };
      });
      return response;
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      if (error instanceof Error) throw invalidArgument(error.message);
      throw internal("Unable to update Staff Artwork size right now.");
    }
  },
);
