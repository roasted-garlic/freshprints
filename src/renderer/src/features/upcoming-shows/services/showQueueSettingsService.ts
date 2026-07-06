import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";

import { db } from "../../../config/firebase";
import { assertNoUndefinedFirestoreFields, withoutUndefinedFields } from "../../firebase/utils/firestoreDocument";
import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";

const SHOW_QUEUE_SETTINGS_DOC_ID = "showQueue";

export type WhatnotAssistedImportStatus = "succeeded" | "failed";

export interface WhatnotAssistedImportSummary {
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
}

export interface ShowQueueSettings {
  /** Applied to newly created shows only; existing shows are never retroactively changed. */
  defaultMaxTotalQuantity?: number;
  updatedBy?: string;
  /** Staff-configurable; defaults to the hardcoded constant client-side when unset. */
  whatnotShowBaseUrl?: string;
  lastWhatnotAssistedImportAt?: Timestamp;
  lastWhatnotAssistedImportStatus?: WhatnotAssistedImportStatus;
  lastWhatnotAssistedImportSummary?: WhatnotAssistedImportSummary;
  lastWhatnotAssistedImportError?: string;
}

function mapWhatnotAssistedImportSummary(value: unknown): WhatnotAssistedImportSummary | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const summary = value as Record<string, unknown>;

  if (
    typeof summary.created !== "number" ||
    typeof summary.updated !== "number" ||
    typeof summary.unchanged !== "number" ||
    typeof summary.skipped !== "number"
  ) {
    return undefined;
  }

  return {
    created: summary.created,
    updated: summary.updated,
    unchanged: summary.unchanged,
    skipped: summary.skipped,
  };
}

function mapShowQueueSettings(data: Record<string, unknown> | undefined): ShowQueueSettings {
  return {
    defaultMaxTotalQuantity:
      typeof data?.defaultMaxTotalQuantity === "number" ? data.defaultMaxTotalQuantity : undefined,
    updatedBy: typeof data?.updatedBy === "string" ? data.updatedBy : undefined,
    whatnotShowBaseUrl: typeof data?.whatnotShowBaseUrl === "string" ? data.whatnotShowBaseUrl : undefined,
    lastWhatnotAssistedImportAt:
      data?.lastWhatnotAssistedImportAt instanceof Timestamp ? data.lastWhatnotAssistedImportAt : undefined,
    lastWhatnotAssistedImportStatus:
      data?.lastWhatnotAssistedImportStatus === "succeeded" || data?.lastWhatnotAssistedImportStatus === "failed"
        ? data.lastWhatnotAssistedImportStatus
        : undefined,
    lastWhatnotAssistedImportSummary: mapWhatnotAssistedImportSummary(data?.lastWhatnotAssistedImportSummary),
    lastWhatnotAssistedImportError:
      typeof data?.lastWhatnotAssistedImportError === "string" ? data.lastWhatnotAssistedImportError : undefined,
  };
}

export const showQueueSettingsService = {
  async getSettings(): Promise<ShowQueueSettings> {
    const snapshot = await getDoc(doc(db, "settings", SHOW_QUEUE_SETTINGS_DOC_ID));
    return mapShowQueueSettings(snapshot.data());
  },

  async updateSettings(
    caller: User,
    input: { defaultMaxTotalQuantity?: number; whatnotShowBaseUrl?: string },
  ): Promise<ShowQueueSettings> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage Show Queue settings.");
    }

    const payload = withoutUndefinedFields({
      defaultMaxTotalQuantity: input.defaultMaxTotalQuantity,
      whatnotShowBaseUrl: input.whatnotShowBaseUrl,
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    });

    assertNoUndefinedFirestoreFields(payload, "Show Queue settings payload");
    await setDoc(doc(db, "settings", SHOW_QUEUE_SETTINGS_DOC_ID), payload, { merge: true });

    return this.getSettings();
  },

  /** Records the outcome of a staff-assisted Whatnot import. Never called by the settings-editing UI. */
  async recordWhatnotAssistedImportResult(
    caller: User,
    result:
      | { status: "succeeded"; summary: WhatnotAssistedImportSummary }
      | { status: "failed"; error: string },
  ): Promise<ShowQueueSettings> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage Show Queue settings.");
    }

    const payload = withoutUndefinedFields({
      lastWhatnotAssistedImportAt: serverTimestamp(),
      lastWhatnotAssistedImportStatus: result.status,
      lastWhatnotAssistedImportSummary: result.status === "succeeded" ? result.summary : undefined,
      lastWhatnotAssistedImportError: result.status === "failed" ? result.error : undefined,
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    });

    assertNoUndefinedFirestoreFields(payload, "Whatnot assisted import result payload");
    await setDoc(doc(db, "settings", SHOW_QUEUE_SETTINGS_DOC_ID), payload, { merge: true });

    return this.getSettings();
  },
};
