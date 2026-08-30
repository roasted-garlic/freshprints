import { HttpsError, onCall } from "firebase-functions/v2/https";

import type {
  ApplyShowProductionRecoveryRequest,
  ApplyShowProductionRecoveryResponse,
  PreviewShowProductionRecoveryRequest,
  PreviewShowProductionRecoveryResponse,
  ShowProductionRecoveryAction,
} from "../../packages/shared/src/types/showProductionRecovery/showProductionRecovery.types";

import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import {
  failedPrecondition,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";
import {
  applyShowProductionRecovery as executeShowProductionRecovery,
  buildShowProductionRecoveryPreview,
} from "./lib/showProductionRecovery";

const RECOVERY_ACTIONS: readonly ShowProductionRecoveryAction[] = [
  "close_empty",
  "mark_fulfilled",
  "release_unfulfilled",
  "requeue_unfulfilled",
  "force_completed",
];
function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw failedPrecondition("Unable to process show production recovery right now.");
}

function parseShowId(data: unknown): string {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }
  const upcomingShowId =
    "upcomingShowId" in data && typeof data.upcomingShowId === "string"
      ? data.upcomingShowId.trim()
      : "";
  if (!upcomingShowId) {
    throw invalidArgument("Select a show.");
  }
  return upcomingShowId;
}

function parseAction(data: unknown): ShowProductionRecoveryAction {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }
  const action =
    "action" in data && typeof data.action === "string" ? data.action.trim() : "";
  if (!RECOVERY_ACTIONS.includes(action as ShowProductionRecoveryAction)) {
    throw invalidArgument("Select a valid recovery action.");
  }
  return action as ShowProductionRecoveryAction;
}

function parseOverrideReason(data: unknown): string | undefined {
  if (!data || typeof data !== "object" || !("overrideReason" in data)) {
    return undefined;
  }
  const reason = data.overrideReason;
  return typeof reason === "string" ? reason : undefined;
}

function parseTargetUpcomingShowId(data: unknown): string | undefined {
  if (!data || typeof data !== "object" || !("targetUpcomingShowId" in data)) {
    return undefined;
  }
  const targetUpcomingShowId = data.targetUpcomingShowId;
  if (typeof targetUpcomingShowId !== "string") {
    return undefined;
  }
  const trimmed = targetUpcomingShowId.trim();
  return trimmed || undefined;
}

function parsePreviewChecksum(data: unknown): string | undefined {
  if (!data || typeof data !== "object" || !("previewChecksum" in data)) {
    return undefined;
  }
  const previewChecksum = data.previewChecksum;
  if (typeof previewChecksum !== "string") {
    return undefined;
  }
  const trimmed = previewChecksum.trim();
  return trimmed || undefined;
}
function assertOwnerCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only owners can apply Force Completed override.");
  }
}

function assertStaffRecoveryCaller(
  caller: Awaited<ReturnType<typeof loadCallerProfile>>,
  action: ShowProductionRecoveryAction,
): void {
  if (action === "force_completed") {
    assertOwnerCaller(caller);
    return;
  }
  assertStaffCaller(caller);
}

export const previewShowProductionRecovery = onCall(
  async (request): Promise<PreviewShowProductionRecoveryResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      const data = request.data as PreviewShowProductionRecoveryRequest;
      const action = parseAction(data);
      assertStaffRecoveryCaller(caller, action);

      return await buildShowProductionRecoveryPreview({
        upcomingShowId: parseShowId(data),
        action,
        overrideReason: parseOverrideReason(data),
        targetUpcomingShowId: parseTargetUpcomingShowId(data),
      });    } catch (error) {
      mapHttpsError(error);
    }
  },
);

export const applyShowProductionRecovery = onCall(
  async (request): Promise<ApplyShowProductionRecoveryResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      const data = request.data as ApplyShowProductionRecoveryRequest;
      const action = parseAction(data);
      assertStaffRecoveryCaller(caller, action);

      const upcomingShowId = parseShowId(data);
      const overrideReason = parseOverrideReason(data);
      const targetUpcomingShowId = parseTargetUpcomingShowId(data);
      const previewChecksum = parsePreviewChecksum(data);

      const preview = await buildShowProductionRecoveryPreview({
        upcomingShowId,
        action,
        overrideReason,
        targetUpcomingShowId,
      });
      if (preview.outcome === "blocked" || preview.outcome === "invalid_action") {
        return {
          outcome: preview.outcome,
          action,
          upcomingShowId,
          message: preview.blockers[0]?.message ?? "Action blocked.",
          blockers: preview.blockers,
          affectedPrintRequestIds: [],
        };
      }

      if (preview.outcome === "already_terminal") {
        return {
          outcome: "already_terminal",
          action,
          upcomingShowId,
          message: "Show is already in a terminal production state.",
          affectedPrintRequestIds: [],
        };
      }

      const recheck = await buildShowProductionRecoveryPreview({
        upcomingShowId,
        action,
        overrideReason,
        targetUpcomingShowId,
      });
      if (recheck.outcome !== "applied") {
        return {
          outcome: recheck.outcome,
          action,
          upcomingShowId,
          message: recheck.blockers[0]?.message ?? "Show state changed. Refresh and try again.",
          blockers: recheck.blockers,
          affectedPrintRequestIds: [],
        };
      }

      if (action === "requeue_unfulfilled") {
        if (!targetUpcomingShowId || !previewChecksum) {
          return {
            outcome: "blocked",
            action,
            upcomingShowId,
            message: "Destination show and preview checksum are required for requeue apply.",
            blockers: [
              {
                code: "preview_stale",
                message: "Destination show and preview checksum are required for requeue apply.",
              },
            ],
            affectedPrintRequestIds: [],
          };
        }
        if (recheck.previewChecksum && recheck.previewChecksum !== previewChecksum) {
          return {
            outcome: "blocked",
            action,
            upcomingShowId,
            message: "Show state changed. Refresh preview and try again.",
            blockers: [
              {
                code: "preview_stale",
                message: "Show state changed. Refresh preview and try again.",
              },
            ],
            affectedPrintRequestIds: [],
          };
        }
      }

      return await executeShowProductionRecovery({
        upcomingShowId,
        action,
        actorId: caller.id,
        overrideReason,
        targetUpcomingShowId,
        previewChecksum,
      });    } catch (error) {
      mapHttpsError(error);
    }
  },
);
