import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import {
  DEV_OVERRIDE_SHOW_URL_SENTINEL,
  type UpsertDevFixtureShowRequest,
  type UpsertDevFixtureShowResponse,
} from "../../packages/shared/src/types/upcomingShow/devFixtureShow.types";

import { adminDb } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import { assertDevFixtureProjectAllowed } from "./lib/devFixtureProjectGate";
import { failedPrecondition, invalidArgument, unauthenticated } from "./lib/errors";

async function loadDefaultMaxTotalQuantity(): Promise<number | undefined> {
  try {
    const snap = await adminDb.collection("settings").doc("showQueue").get();
    if (!snap.exists) {
      return undefined;
    }
    const value = snap.data()?.defaultMaxTotalQuantity;
    return typeof value === "number" ? value : undefined;
  } catch {
    return undefined;
  }
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw failedPrecondition("Unable to save DEV fixture show right now.");
}

function buildDevFixtureCreatePayload(input: {
  title?: string;
  scheduledStartAt: Timestamp;
  notes?: string;
  showQueueSettingsDefaultMax?: number;
  callerUid: string;
}) {
  return {
    source: "dev_fixture" as const,
    devFixtureSentinel: DEV_OVERRIDE_SHOW_URL_SENTINEL,
    scheduledStartAt: input.scheduledStartAt,
    status: "scheduled" as const,
    syncStatus: "idle" as const,
    isArchived: false,
    productionStatus: "open" as const,
    maxQuantityOverridden: false,
    allocatedQuantity: 0,
    accumulatedPrintMs: 0,
    createdBy: input.callerUid,
    updatedBy: input.callerUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.showQueueSettingsDefaultMax !== undefined
      ? { maxTotalQuantity: input.showQueueSettingsDefaultMax }
      : {}),
  };
}

function buildDevFixtureUpdatePayload(input: {
  title?: string;
  scheduledStartAt: Timestamp;
  notes?: string;
  callerUid: string;
}) {
  return {
    scheduledStartAt: input.scheduledStartAt,
    updatedBy: input.callerUid,
    updatedAt: FieldValue.serverTimestamp(),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  };
}

function parseRequest(data: unknown): UpsertDevFixtureShowRequest {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }

  const scheduledStartAtIso =
    "scheduledStartAtIso" in data && typeof data.scheduledStartAtIso === "string"
      ? data.scheduledStartAtIso.trim()
      : "";
  if (!scheduledStartAtIso) {
    throw invalidArgument("Scheduled date and time are required.");
  }

  const scheduledStartAt = Timestamp.fromDate(new Date(scheduledStartAtIso));
  if (Number.isNaN(scheduledStartAt.toDate().getTime())) {
    throw invalidArgument("Scheduled date and time are invalid.");
  }

  const upcomingShowId =
    "upcomingShowId" in data && typeof data.upcomingShowId === "string"
      ? data.upcomingShowId.trim()
      : undefined;

  const title =
    "title" in data && typeof data.title === "string" ? data.title.trim() : undefined;
  const notes =
    "notes" in data && typeof data.notes === "string" ? data.notes.trim() : undefined;

  return {
    title: title || undefined,
    scheduledStartAtIso,
    notes: notes || undefined,
    upcomingShowId: upcomingShowId || undefined,
  };
}

export const upsertDevFixtureShow = onCall(
  async (request): Promise<UpsertDevFixtureShowResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      assertDevFixtureProjectAllowed();
      const caller = await loadCallerProfile(request.auth.uid);
      assertStaffCaller(caller);

      const input = parseRequest(request.data);
      const scheduledStartAt = Timestamp.fromDate(new Date(input.scheduledStartAtIso));
      const showQueueSettingsDefaultMax = await loadDefaultMaxTotalQuantity();

      if (input.upcomingShowId) {
        const showRef = adminDb.collection("upcomingShows").doc(input.upcomingShowId);
        const existingSnap = await showRef.get();
        if (!existingSnap.exists) {
          throw invalidArgument("Show not found.");
        }
        const existing = existingSnap.data() ?? {};
        if (existing.source !== "dev_fixture") {
          throw invalidArgument("Only DEV fixture shows can be updated through this path.");
        }

        await showRef.update(
          buildDevFixtureUpdatePayload({
            title: input.title,
            scheduledStartAt,
            notes: input.notes,
            callerUid: request.auth.uid,
          }),
        );

        return { showId: showRef.id };
      }

      const showRef = adminDb.collection("upcomingShows").doc();
      await showRef.set(
        buildDevFixtureCreatePayload({
          title: input.title,
          scheduledStartAt,
          notes: input.notes,
          showQueueSettingsDefaultMax: showQueueSettingsDefaultMax,
          callerUid: request.auth.uid,
        }),
      );

      return { showId: showRef.id };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
