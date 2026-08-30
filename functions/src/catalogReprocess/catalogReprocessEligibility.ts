import { FieldPath, type QueryDocumentSnapshot } from "firebase-admin/firestore";

import {
  CATALOG_REPROCESS_PREVIEW_PAGE_SIZE,
  CATALOG_REPROCESS_PROMPT_VERSION_SNAPSHOT,
  CATALOG_REPROCESS_NORMALIZER_VERSION_SNAPSHOT,
  isAiReviewQueueEligibleDesign,
  isReadyCatalogEligibleDesign,
  type CatalogReprocessTargetType,
} from "../../../packages/shared/src/constants/catalogReprocess.constants";
import type {
  CatalogReprocessExclusionBuckets,
  CatalogReprocessNotesInventory,
  CatalogReprocessReadyExclusionBuckets,
  CatalogReprocessReadyInventory,
  CatalogReprocessTagDensityBuckets,
} from "../../../packages/shared/src/types/admin/catalogReprocess.types";
import { adminDb } from "../lib/admin";

export { isAiReviewQueueEligibleDesign, isReadyCatalogEligibleDesign };

export function buildAiReviewQueueEligibleQuery() {
  return adminDb
    .collection("designs")
    .where("status", "==", "imported")
    .where("aiReviewStatus", "==", "needs_review")
    .orderBy(FieldPath.documentId());
}

export async function countAiReviewQueueEligible(): Promise<number> {
  const snapshot = await buildAiReviewQueueEligibleQuery().count().get();
  return snapshot.data().count;
}

export async function countDesignsByStatus(status: string): Promise<number> {
  const snapshot = await adminDb.collection("designs").where("status", "==", status).count().get();
  return snapshot.data().count;
}

/** Processing-tab style: pending review while imported/processing. */
export async function countPendingReviewProcessing(): Promise<number> {
  const imported = await adminDb
    .collection("designs")
    .where("status", "==", "imported")
    .where("aiReviewStatus", "==", "pending")
    .count()
    .get();
  const processing = await adminDb
    .collection("designs")
    .where("status", "==", "processing")
    .where("aiReviewStatus", "==", "pending")
    .count()
    .get();
  return imported.data().count + processing.data().count;
}

export async function pageAiReviewQueueEligibleDesigns(input: {
  startAfterDesignId?: string;
  limit: number;
}): Promise<QueryDocumentSnapshot[]> {
  let query = buildAiReviewQueueEligibleQuery().limit(input.limit);
  if (input.startAfterDesignId) {
    const cursorSnap = await adminDb.collection("designs").doc(input.startAfterDesignId).get();
    if (cursorSnap.exists) {
      query = query.startAfter(cursorSnap);
    }
  }
  const page = await query.get();
  return page.docs;
}

function bump(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function noteRecommendation(input: {
  eligibleCount: number;
  designsWithNonEmptyNotes: number;
  maxNoteLength: number;
}): CatalogReprocessNotesInventory["recommendation"] {
  if (input.designsWithNonEmptyNotes === 0) {
    return "clear_ok";
  }
  // Non-trivial: more than 3 notes, or any note longer than 40 chars, or >5% of backlog.
  if (
    input.designsWithNonEmptyNotes > 3 ||
    input.maxNoteLength > 40 ||
    (input.eligibleCount > 0 && input.designsWithNonEmptyNotes / input.eligibleCount > 0.05)
  ) {
    return "escalate_preserve_review";
  }
  return "clear_ok";
}

export async function buildAiReviewQueueInventory(): Promise<{
  eligibleCount: number;
  statusDistribution: Record<string, number>;
  aiReviewStatusDistribution: Record<string, number>;
  promptVersionDistribution: Record<string, number>;
  normalizerVersionDistribution: Record<string, number>;
  alreadyV29Count: number;
  missingProfileCount: number;
  exclusions: CatalogReprocessExclusionBuckets;
  aiReviewNotes: CatalogReprocessNotesInventory;
  exclusionMethod: "indexed_status_counts";
}> {
  const eligibleCount = await countAiReviewQueueEligible();

  const [rejectedStatus, readyStatus, archivedStatus, pendingReviewProcessing] = await Promise.all([
    countDesignsByStatus("rejected"),
    countDesignsByStatus("ready"),
    countDesignsByStatus("archived"),
    countPendingReviewProcessing(),
  ]);

  const exclusions: CatalogReprocessExclusionBuckets = {
    rejectedStatus,
    readyStatus,
    archivedStatus,
    pendingReviewProcessing,
    eligibleAiReviewQueue: eligibleCount,
  };

  const statusDistribution: Record<string, number> = { imported: eligibleCount };
  const aiReviewStatusDistribution: Record<string, number> = {
    needs_review: eligibleCount,
  };
  const promptVersionDistribution: Record<string, number> = {};
  const normalizerVersionDistribution: Record<string, number> = {};
  let alreadyV29Count = 0;
  let missingProfileCount = 0;
  let designsWithNonEmptyNotes = 0;
  let maxNoteLength = 0;
  let designsScanned = 0;
  let cursor: string | undefined;

  while (designsScanned < eligibleCount) {
    const docs = await pageAiReviewQueueEligibleDesigns({
      startAfterDesignId: cursor,
      limit: CATALOG_REPROCESS_PREVIEW_PAGE_SIZE,
    });
    if (docs.length === 0) {
      break;
    }

    for (const doc of docs) {
      designsScanned += 1;
      const data = doc.data();
      const profile = data.smartProfile as
        | { provenance?: { promptVersion?: string; normalizerVersion?: string } }
        | undefined;
      if (!profile || typeof profile !== "object") {
        missingProfileCount += 1;
        bump(promptVersionDistribution, "(missing)");
        bump(normalizerVersionDistribution, "(missing)");
      } else {
        const promptVersion =
          typeof profile.provenance?.promptVersion === "string" &&
          profile.provenance.promptVersion.trim()
            ? profile.provenance.promptVersion.trim()
            : "(missing)";
        const normalizerVersion =
          typeof profile.provenance?.normalizerVersion === "string" &&
          profile.provenance.normalizerVersion.trim()
            ? profile.provenance.normalizerVersion.trim()
            : "(missing)";
        bump(promptVersionDistribution, promptVersion);
        bump(normalizerVersionDistribution, normalizerVersion);
        if (promptVersion === CATALOG_REPROCESS_PROMPT_VERSION_SNAPSHOT) {
          alreadyV29Count += 1;
        }
      }

      const notes = typeof data.aiReviewNotes === "string" ? data.aiReviewNotes.trim() : "";
      if (notes.length > 0) {
        designsWithNonEmptyNotes += 1;
        maxNoteLength = Math.max(maxNoteLength, notes.length);
      }
    }

    cursor = docs[docs.length - 1]?.id;
    if (docs.length < CATALOG_REPROCESS_PREVIEW_PAGE_SIZE) {
      break;
    }
  }

  return {
    eligibleCount,
    statusDistribution,
    aiReviewStatusDistribution,
    promptVersionDistribution,
    normalizerVersionDistribution,
    alreadyV29Count,
    missingProfileCount,
    exclusions,
    aiReviewNotes: {
      designsScanned,
      designsWithNonEmptyNotes,
      maxNoteLength,
      recommendation: noteRecommendation({
        eligibleCount,
        designsWithNonEmptyNotes,
        maxNoteLength,
      }),
    },
    exclusionMethod: "indexed_status_counts",
  };
}

export async function estimateEligibleCount(targetType: CatalogReprocessTargetType): Promise<number> {
  if (targetType === "ai_review_queue") {
    return countAiReviewQueueEligible();
  }
  if (targetType === "ready_catalog") {
    return countReadyCatalogEligible();
  }
  return 0;
}

export function buildReadyCatalogEligibleQuery() {
  return adminDb
    .collection("designs")
    .where("status", "==", "ready")
    .where("aiReviewStatus", "==", "approved")
    .orderBy(FieldPath.documentId());
}

export async function countReadyCatalogEligible(): Promise<number> {
  const snapshot = await buildReadyCatalogEligibleQuery().count().get();
  return snapshot.data().count;
}

export async function pageReadyCatalogEligibleDesigns(input: {
  startAfterDesignId?: string;
  limit: number;
}): Promise<QueryDocumentSnapshot[]> {
  let query = buildReadyCatalogEligibleQuery().limit(input.limit);
  if (input.startAfterDesignId) {
    const cursorSnap = await adminDb.collection("designs").doc(input.startAfterDesignId).get();
    if (cursorSnap.exists) {
      query = query.startAfter(cursorSnap);
    }
  }
  const page = await query.get();
  return page.docs;
}

function classifyTagDensity(tagCount: number): keyof CatalogReprocessTagDensityBuckets {
  if (tagCount === 0) {
    return "zeroTags";
  }
  if (tagCount <= 3) {
    return "lowTags";
  }
  return "highTags";
}

export async function buildReadyCatalogInventory(): Promise<CatalogReprocessReadyInventory> {
  const eligibleCount = await countReadyCatalogEligible();

  const [importedNeedsReview, rejectedStatus, archivedStatus, pendingReviewProcessing, readyTotal] =
    await Promise.all([
      countAiReviewQueueEligible(),
      countDesignsByStatus("rejected"),
      countDesignsByStatus("archived"),
      countPendingReviewProcessing(),
      countDesignsByStatus("ready"),
    ]);

  const readyNotApproved =
    readyTotal > eligibleCount ? readyTotal - eligibleCount : 0;

  const exclusions: CatalogReprocessReadyExclusionBuckets = {
    importedNeedsReview,
    rejectedStatus,
    archivedStatus,
    pendingReviewProcessing,
    readyNotApproved,
    eligibleReadyCatalog: eligibleCount,
  };

  const statusDistribution: Record<string, number> = { ready: eligibleCount };
  const aiReviewStatusDistribution: Record<string, number> = { approved: eligibleCount };
  const promptVersionDistribution: Record<string, number> = {};
  const normalizerVersionDistribution: Record<string, number> = {};
  const tagDensityBuckets: CatalogReprocessTagDensityBuckets = {
    zeroTags: 0,
    lowTags: 0,
    highTags: 0,
  };
  let alreadyCurrentPipelineCount = 0;
  let missingProfileCount = 0;
  let designsScanned = 0;
  let cursor: string | undefined;

  while (designsScanned < eligibleCount) {
    const docs = await pageReadyCatalogEligibleDesigns({
      startAfterDesignId: cursor,
      limit: CATALOG_REPROCESS_PREVIEW_PAGE_SIZE,
    });
    if (docs.length === 0) {
      break;
    }

    for (const doc of docs) {
      designsScanned += 1;
      const data = doc.data();
      const profile = data.smartProfile as
        | { provenance?: { promptVersion?: string; normalizerVersion?: string } }
        | undefined;
      if (!profile || typeof profile !== "object") {
        missingProfileCount += 1;
        bump(promptVersionDistribution, "(missing)");
        bump(normalizerVersionDistribution, "(missing)");
      } else {
        const promptVersion =
          typeof profile.provenance?.promptVersion === "string" &&
          profile.provenance.promptVersion.trim()
            ? profile.provenance.promptVersion.trim()
            : "(missing)";
        const normalizerVersion =
          typeof profile.provenance?.normalizerVersion === "string" &&
          profile.provenance.normalizerVersion.trim()
            ? profile.provenance.normalizerVersion.trim()
            : "(missing)";
        bump(promptVersionDistribution, promptVersion);
        bump(normalizerVersionDistribution, normalizerVersion);
        if (
          promptVersion === CATALOG_REPROCESS_PROMPT_VERSION_SNAPSHOT &&
          normalizerVersion === CATALOG_REPROCESS_NORMALIZER_VERSION_SNAPSHOT
        ) {
          alreadyCurrentPipelineCount += 1;
        }
      }

      const tags = Array.isArray(data.tags)
        ? data.tags.filter((tag): tag is string => typeof tag === "string")
        : [];
      const bucket = classifyTagDensity(tags.length);
      tagDensityBuckets[bucket] += 1;
    }

    cursor = docs[docs.length - 1]?.id;
    if (docs.length < CATALOG_REPROCESS_PREVIEW_PAGE_SIZE) {
      break;
    }
  }

  return {
    eligibleCount,
    statusDistribution,
    aiReviewStatusDistribution,
    promptVersionDistribution,
    normalizerVersionDistribution,
    alreadyCurrentPipelineCount,
    missingProfileCount,
    exclusions,
    tagDensityBuckets,
    exclusionMethod: "indexed_status_counts",
  };
}
