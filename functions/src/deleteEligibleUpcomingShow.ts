import { HttpsError, onCall } from "firebase-functions/v2/https";

import {
  DELETE_UPCOMING_SHOW_CONFIRMATION_PHRASE,
  type DeleteEligibleUpcomingShowRequest,
  type DeleteEligibleUpcomingShowResponse,
  type PreviewUpcomingShowDeletionRequest,
  type PreviewUpcomingShowDeletionResponse,
} from "../../packages/shared/src/types/deletion/deletion.types";
import type { DeletionCallableWarmupResponse } from "../../packages/shared/src/types/deletion/deletionWarmup.types";
import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import {
  showProductionStatusBlocksHardDelete,
  upcomingShowStatusBlocksHardDelete,
} from "./lib/deletionEligibility";
import { deletionWarmupOk, isDeletionCallableWarmupRequest } from "./lib/deletionWarmup";
import {
  failedPrecondition,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";

function assertOwnerCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only owners can delete shows.");
  }
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw failedPrecondition("Unable to process show deletion right now.");
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

function requirePhrase(data: unknown): string {
  const phrase =
    data &&
    typeof data === "object" &&
    "confirmationPhrase" in data &&
    typeof data.confirmationPhrase === "string"
      ? data.confirmationPhrase.trim()
      : "";
  if (phrase !== DELETE_UPCOMING_SHOW_CONFIRMATION_PHRASE) {
    throw invalidArgument(
      `Confirmation phrase must be exactly "${DELETE_UPCOMING_SHOW_CONFIRMATION_PHRASE}".`,
    );
  }
  return phrase;
}

function showLabel(data: Record<string, unknown> | undefined): string {
  const title =
    typeof data?.title === "string" && data.title.trim()
      ? data.title.trim()
      : typeof data?.name === "string" && data.name.trim()
        ? data.name.trim()
        : "Show";
  const dateLabel =
    typeof data?.showDateLabel === "string"
      ? data.showDateLabel
      : typeof data?.dateLabel === "string"
        ? data.dateLabel
        : null;
  return dateLabel ? `${title} (${dateLabel})` : title;
}

async function buildPreview(upcomingShowId: string): Promise<PreviewUpcomingShowDeletionResponse> {
  const snap = await adminDb.collection("upcomingShows").doc(upcomingShowId).get();
  if (!snap.exists) {
    return {
      outcome: "already_done",
      blockers: [],
      entityLabel: "Show",
      notes: ["This show is already gone."],
      upcomingShowId,
      showLabel: "Show",
      allocationCount: 0,
    };
  }

  const data = (snap.data() ?? {}) as Record<string, unknown>;
  const label = showLabel(data);
  const allocations = await adminDb
    .collection("showAllocations")
    .where("upcomingShowId", "==", upcomingShowId)
    .limit(50)
    .get();

  if (!allocations.empty) {
    const requestLabels: string[] = [];
    for (const doc of allocations.docs.slice(0, 8)) {
      const name =
        typeof doc.data().printRequestNameSnapshot === "string"
          ? doc.data().printRequestNameSnapshot
          : typeof doc.data().customerUsernameSnapshot === "string"
            ? doc.data().customerUsernameSnapshot
            : null;
      if (typeof name === "string" && name.trim()) {
        requestLabels.push(name.trim());
      }
    }

    return {
      outcome: "blocked",
      blockers: [
        {
          code: "has_allocations",
          message:
            requestLabels.length > 0
              ? `This show cannot be deleted while it has allocations (${requestLabels.join(", ")}). Remove allocations through the Show Queue workflow first.`
              : `This show cannot be deleted while it has ${allocations.size} allocation(s). Remove allocations through the Show Queue workflow first.`,
          count: allocations.size,
          labels: requestLabels,
          navigateHint: "Show Queue",
        },
      ],
      entityLabel: label,
      upcomingShowId,
      showLabel: label,
      allocationCount: allocations.size,
    };
  }

  if (
    showProductionStatusBlocksHardDelete(data.productionStatus) ||
    upcomingShowStatusBlocksHardDelete(data.status) ||
    data.isArchived === true
  ) {
    return {
      outcome: "blocked",
      blockers: [
        {
          code: "historical_or_production_show",
          message:
            "This show has production or past-show history and cannot be permanently deleted. Archive or cancel it instead.",
        },
      ],
      entityLabel: label,
      notes: ["Use the existing archive workflow for historical shows."],
      upcomingShowId,
      showLabel: label,
      allocationCount: 0,
    };
  }

  return {
    outcome: "allowed_hard_delete",
    blockers: [],
    entityLabel: label,
    confirmLabel: "Delete empty show",
    notes: ["This permanently deletes an empty upcoming show with no allocations."],
    upcomingShowId,
    showLabel: label,
    allocationCount: 0,
  };
}

export const previewUpcomingShowDeletion = onCall(
  async (
    request,
  ): Promise<PreviewUpcomingShowDeletionResponse | DeletionCallableWarmupResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);
      if (isDeletionCallableWarmupRequest(request.data)) {
        return deletionWarmupOk();
      }
      return await buildPreview(parseShowId(request.data as PreviewUpcomingShowDeletionRequest));
    } catch (error) {
      mapHttpsError(error);
    }
  },
);

export const deleteEligibleUpcomingShow = onCall(
  async (
    request,
  ): Promise<DeleteEligibleUpcomingShowResponse | DeletionCallableWarmupResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);
      if (isDeletionCallableWarmupRequest(request.data)) {
        return deletionWarmupOk();
      }
      const upcomingShowId = parseShowId(request.data as DeleteEligibleUpcomingShowRequest);
      requirePhrase(request.data);

      // Single server-side eligibility check immediately before mutate (matches print-request
      // TOCTOU pattern). Client already ran preview for the dialog; a second in-request
      // buildPreview was redundant same-request work and did not add safety.
      const recheck = await buildPreview(upcomingShowId);
      if (recheck.outcome === "already_done") {
        return {
          outcome: "already_done",
          message: "Show already deleted.",
          entityId: upcomingShowId,
          upcomingShowId,
        };
      }
      if (recheck.outcome !== "allowed_hard_delete") {
        return {
          outcome: recheck.outcome,
          blockers: recheck.blockers,
          message: recheck.blockers[0]?.message ?? "This show cannot be deleted.",
          entityId: upcomingShowId,
          upcomingShowId,
        };
      }

      await adminDb.collection("upcomingShows").doc(upcomingShowId).delete();

      return {
        outcome: "allowed_hard_delete",
        message: "Empty show deleted.",
        entityId: upcomingShowId,
        upcomingShowId,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
