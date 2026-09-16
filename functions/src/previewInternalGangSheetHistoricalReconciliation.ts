import { HttpsError, onCall } from "firebase-functions/v2/https";

import type {
  ApplyInternalGangSheetHistoricalReconciliationRequest,
  ApplyInternalGangSheetHistoricalReconciliationResponse,
  PreviewInternalGangSheetHistoricalReconciliationRequest,
  PreviewInternalGangSheetHistoricalReconciliationResponse,
} from "../../packages/shared/src/types/staffGangSheet/internalGangSheetHistoricalReconciliation.types";

import { loadCallerProfile } from "./lib/caller";
import {
  failedPrecondition,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";
import {
  applyInternalGangSheetHistoricalReconciliation,
  buildInternalGangSheetHistoricalReconciliationPreview,
} from "./lib/internalGangSheetHistoricalReconciliation";

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw failedPrecondition(error.message);
  }
  throw failedPrecondition("Unable to reconcile this Internal Gang Sheet right now.");
}

function assertOwnerCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only owners can reconcile historical Internal Gang Sheets.");
  }
}

function parseUpcomingShowId(data: unknown): string {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }
  const upcomingShowId =
    "upcomingShowId" in data && typeof data.upcomingShowId === "string"
      ? data.upcomingShowId.trim()
      : "";
  if (!upcomingShowId) {
    throw invalidArgument("Select an Internal Gang Sheet.");
  }
  return upcomingShowId;
}

function parsePreviewChecksum(data: unknown): string | undefined {
  if (!data || typeof data !== "object" || !("previewChecksum" in data)) {
    return undefined;
  }
  const value = data.previewChecksum;
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

export const previewInternalGangSheetHistoricalReconciliation = onCall(
  async (
    request,
  ): Promise<PreviewInternalGangSheetHistoricalReconciliationResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);
      const upcomingShowId = parseUpcomingShowId(
        request.data as PreviewInternalGangSheetHistoricalReconciliationRequest,
      );
      return await buildInternalGangSheetHistoricalReconciliationPreview(upcomingShowId);
    } catch (error) {
      mapHttpsError(error);
    }
  },
);

export const applyInternalGangSheetHistoricalReconciliationCallable = onCall(
  async (
    request,
  ): Promise<ApplyInternalGangSheetHistoricalReconciliationResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);
      const upcomingShowId = parseUpcomingShowId(
        request.data as ApplyInternalGangSheetHistoricalReconciliationRequest,
      );
      const previewChecksum = parsePreviewChecksum(request.data);
      return await applyInternalGangSheetHistoricalReconciliation({
        upcomingShowId,
        actorId: caller.id,
        previewChecksum,
      });
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
