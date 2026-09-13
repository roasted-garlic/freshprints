import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  PRINT_REQUEST_LIMIT_SETTINGS_DOC_ID,
  parsePrintRequestLimitSettingsInput,
  resolvePrintRequestLimitSettings,
  type PrintRequestLimitSettings,
} from "../../packages/shared/src/constants/printRequest/printRequestLimitSettings.constants";
import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";

export const updatePrintRequestLimitSettings = onCall(
  async (request): Promise<PrintRequestLimitSettings> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    const caller = await loadCallerProfile(request.auth.uid);
    if (!caller.isActive || caller.role !== "owner") {
      throw permissionDenied("Only active owners can update print request limits.");
    }

    const parsed = parsePrintRequestLimitSettingsInput(request.data);
    if (!parsed) {
      throw invalidArgument(
        "Print request limits must include valid maxQuantityPerPrintRequest and maxQuantityPerShowPerCustomer values within allowed bounds.",
      );
    }

    const settings: PrintRequestLimitSettings = {
      ...parsed,
      updatedBy: request.auth.uid,
    };
    await adminDb.collection("settings").doc(PRINT_REQUEST_LIMIT_SETTINGS_DOC_ID).set({
      maxQuantityPerPrintRequest: settings.maxQuantityPerPrintRequest,
      maxQuantityPerShowPerCustomer: settings.maxQuantityPerShowPerCustomer,
      linkPrintRequestAndCustomerShowLimits: settings.linkPrintRequestAndCustomerShowLimits,
      dailyDesignsAddedToRequestsLimit: settings.dailyDesignsAddedToRequestsLimit,
      portalInteractiveUpscaleEnabled: settings.portalInteractiveUpscaleEnabled,
      updatedBy: settings.updatedBy,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return resolvePrintRequestLimitSettings(settings);
  },
);
