/**
 * Auto-build / refresh bounded Smart Profile vocabulary snapshot.
 *
 * Writes `settings/aiSmartProfileVocab` from a **bounded** sample of existing
 * designs that already have Smart Profiles (Firestore, same project = env-isolated).
 * Enrichment only **reads** the small cached snapshot — this module owns refresh
 * and must not pull Algolia admin into `enqueueAiEnrichment`.
 */

import { logger } from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { SMART_PROFILE_VERSION } from "../../../packages/shared/src/types/catalog/smartProfile.types";
import type { DesignSmartProfile } from "../../../packages/shared/src/types/catalog/smartProfile.types";
import {
  aggregateSmartProfileVocabFromProfiles,
  smartProfileVocabListsHaveValues,
} from "../../../packages/shared/src/utils/aggregateSmartProfileVocab";
import {
  SMART_PROFILE_VOCAB_REFRESH_THROTTLE_MS,
  SMART_PROFILE_VOCAB_SAMPLE_LIMIT_DEFAULT,
  SMART_PROFILE_VOCAB_TOP_N_DEFAULT,
  type SmartProfileVocabLists,
} from "../../../packages/shared/src/utils/smartProfileVocab";

import { adminDb } from "../lib/admin";
import { assertStaffCaller, loadCallerProfile } from "../lib/caller";
import { permissionDenied, unauthenticated } from "../lib/errors";
import { invalidateSmartProfileVocabSnapshotCache } from "./loadSmartProfileVocabSnapshot";

export const SMART_PROFILE_VOCAB_DOC_PATH = "settings/aiSmartProfileVocab";

export type RefreshSmartProfileVocabSnapshotResult = {
  ok: true;
  source: "firestore_sample";
  sampleSize: number;
  sampleLimit: number;
  topN: number;
  refreshedAt: string;
  listCounts: Record<string, number>;
  skipped?: never;
};

export type MaybeRefreshSmartProfileVocabSnapshotResult =
  | RefreshSmartProfileVocabSnapshotResult
  | {
      ok: true;
      skipped: true;
      reason: "throttled";
      refreshedAt: string | null;
    };

function listCounts(lists: SmartProfileVocabLists): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, values] of Object.entries(lists)) {
    if (Array.isArray(values)) {
      out[key] = values.length;
    }
  }
  return out;
}

function parseRefreshedAtMs(data: Record<string, unknown> | undefined): number | null {
  if (!data) {
    return null;
  }
  const raw = data.refreshedAt;
  if (typeof raw === "string") {
    const ms = Date.parse(raw);
    return Number.isFinite(ms) ? ms : null;
  }
  if (
    raw &&
    typeof raw === "object" &&
    "toMillis" in raw &&
    typeof (raw as { toMillis?: unknown }).toMillis === "function"
  ) {
    return (raw as { toMillis: () => number }).toMillis();
  }
  return null;
}

function assertOwnerAdminCaller(
  caller: Awaited<ReturnType<typeof loadCallerProfile>>,
): void {
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied("Owner or admin required.");
  }
}

/**
 * Sample up to `sampleLimit` designs with Smart Profile v1 and write top-N lists.
 */
export async function refreshSmartProfileVocabSnapshot(options?: {
  sampleLimit?: number;
  topN?: number;
}): Promise<RefreshSmartProfileVocabSnapshotResult> {
  const sampleLimit =
    typeof options?.sampleLimit === "number" && options.sampleLimit > 0
      ? Math.min(Math.floor(options.sampleLimit), SMART_PROFILE_VOCAB_SAMPLE_LIMIT_DEFAULT)
      : SMART_PROFILE_VOCAB_SAMPLE_LIMIT_DEFAULT;
  const topN =
    typeof options?.topN === "number" && options.topN > 0
      ? Math.min(Math.floor(options.topN), SMART_PROFILE_VOCAB_TOP_N_DEFAULT)
      : SMART_PROFILE_VOCAB_TOP_N_DEFAULT;

  const snap = await adminDb
    .collection("designs")
    .where("smartProfile.provenance.version", "==", SMART_PROFILE_VERSION)
    .limit(sampleLimit)
    .get();

  const profiles: DesignSmartProfile[] = [];
  for (const doc of snap.docs) {
    const smartProfile = doc.data()?.smartProfile as DesignSmartProfile | undefined;
    if (smartProfile && typeof smartProfile === "object") {
      profiles.push(smartProfile);
    }
  }

  const aggregated = aggregateSmartProfileVocabFromProfiles(profiles, {
    sampleLimit,
    topN,
  });
  const refreshedAt = new Date().toISOString();

  const payload: Record<string, unknown> = {
    topN: aggregated.topN,
    sampleLimit: aggregated.sampleLimit,
    sampleSize: aggregated.sampleSize,
    source: "firestore_sample",
    refreshedAt,
    updatedAt: refreshedAt,
  };

  for (const [dim, values] of Object.entries(aggregated.lists)) {
    if (Array.isArray(values) && values.length > 0) {
      payload[dim] = [...values];
    }
  }

  await adminDb.doc(SMART_PROFILE_VOCAB_DOC_PATH).set(payload, { merge: false });
  invalidateSmartProfileVocabSnapshotCache();

  const result: RefreshSmartProfileVocabSnapshotResult = {
    ok: true,
    source: "firestore_sample",
    sampleSize: aggregated.sampleSize,
    sampleLimit: aggregated.sampleLimit,
    topN: aggregated.topN,
    refreshedAt,
    listCounts: listCounts(aggregated.lists),
  };

  logger.info("smart-profile-vocab-refresh-completed", result);
  return result;
}

/**
 * Refresh when snapshot is missing/empty or older than throttle window.
 * Safe to fire-and-forget after enrichment writes.
 */
export async function maybeRefreshSmartProfileVocabSnapshot(options?: {
  force?: boolean;
  throttleMs?: number;
}): Promise<MaybeRefreshSmartProfileVocabSnapshotResult> {
  const throttleMs =
    typeof options?.throttleMs === "number" && options.throttleMs >= 0
      ? options.throttleMs
      : SMART_PROFILE_VOCAB_REFRESH_THROTTLE_MS;

  if (!options?.force) {
    try {
      const existing = await adminDb.doc(SMART_PROFILE_VOCAB_DOC_PATH).get();
      const data = existing.data() as Record<string, unknown> | undefined;
      const refreshedAtMs = parseRefreshedAtMs(data);
      const lists: SmartProfileVocabLists = {};
      for (const key of Object.keys(data ?? {})) {
        const value = data?.[key];
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
          (lists as Record<string, string[]>)[key] = value as string[];
        }
      }
      const hasValues = smartProfileVocabListsHaveValues(lists);
      if (
        hasValues &&
        refreshedAtMs != null &&
        Date.now() - refreshedAtMs < throttleMs
      ) {
        return {
          ok: true,
          skipped: true,
          reason: "throttled",
          refreshedAt:
            typeof data?.refreshedAt === "string" ? data.refreshedAt : null,
        };
      }
    } catch (error) {
      logger.warn("smart-profile-vocab-refresh-throttle-read-failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return refreshSmartProfileVocabSnapshot();
}

/** Owner/admin callable — force rebuild of the bounded vocab snapshot. */
export const refreshSmartProfileVocabSnapshotCallable = onCall(
  { timeoutSeconds: 120, memory: "512MiB" },
  async (request): Promise<RefreshSmartProfileVocabSnapshotResult> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    const caller = await loadCallerProfile(request.auth.uid);
    assertStaffCaller(caller);
    assertOwnerAdminCaller(caller);
    return refreshSmartProfileVocabSnapshot();
  },
);

/** Periodic rebuild so vocab stays current even with low enrichment traffic. */
export const refreshSmartProfileVocabSnapshotScheduled = onSchedule(
  {
    schedule: "every 6 hours",
    timeZone: "America/Chicago",
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async () => {
    await refreshSmartProfileVocabSnapshot();
  },
);