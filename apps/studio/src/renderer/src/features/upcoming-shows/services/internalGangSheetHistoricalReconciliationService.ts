import { FirebaseError } from "firebase/app";

import type {
  ApplyInternalGangSheetHistoricalReconciliationRequest,
  ApplyInternalGangSheetHistoricalReconciliationResponse,
  PreviewInternalGangSheetHistoricalReconciliationRequest,
  PreviewInternalGangSheetHistoricalReconciliationResponse,
} from "@fresh-prints/shared/types/staffGangSheet/internalGangSheetHistoricalReconciliation.types";

import { callTracedFunction } from "../../../config/tracedCallable";

export const INTERNAL_GANG_SHEET_HISTORICAL_RECONCILIATION_DEPLOY_HINT =
  "Deploy previewInternalGangSheetHistoricalReconciliation and applyInternalGangSheetHistoricalReconciliation to your DEV Firebase project, then reload Studio.";

function mapError(error: unknown, fallback: string): string {
  if (error instanceof FirebaseError) {
    const message = error.message?.trim() ?? "";
    if (message && message !== "internal" && message !== "INTERNAL") {
      return message;
    }
    if (error.code === "functions/permission-denied") {
      return "Only owners can reconcile historical Internal Gang Sheets.";
    }
    if (error.code === "functions/unauthenticated") {
      return "You must be signed in to reconcile historical Internal Gang Sheets.";
    }
    return INTERNAL_GANG_SHEET_HISTORICAL_RECONCILIATION_DEPLOY_HINT;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

export const internalGangSheetHistoricalReconciliationService = {
  async preview(
    request: PreviewInternalGangSheetHistoricalReconciliationRequest,
  ): Promise<PreviewInternalGangSheetHistoricalReconciliationResponse> {
    try {
      return await callTracedFunction<
        PreviewInternalGangSheetHistoricalReconciliationRequest,
        PreviewInternalGangSheetHistoricalReconciliationResponse
      >("previewInternalGangSheetHistoricalReconciliation", {
        source: "internalGangSheetHistoricalReconciliationService.preview",
      })(request);
    } catch (error) {
      throw new Error(mapError(error, "Unable to preview historical reconciliation."));
    }
  },

  async apply(
    request: ApplyInternalGangSheetHistoricalReconciliationRequest,
  ): Promise<ApplyInternalGangSheetHistoricalReconciliationResponse> {
    try {
      return await callTracedFunction<
        ApplyInternalGangSheetHistoricalReconciliationRequest,
        ApplyInternalGangSheetHistoricalReconciliationResponse
      >("applyInternalGangSheetHistoricalReconciliation", {
        source: "internalGangSheetHistoricalReconciliationService.apply",
      })(request);
    } catch (error) {
      throw new Error(mapError(error, "Unable to apply historical reconciliation."));
    }
  },
};
