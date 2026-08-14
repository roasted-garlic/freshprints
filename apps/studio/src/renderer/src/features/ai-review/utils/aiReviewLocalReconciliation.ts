import type { Design } from "../../designs/types/design.types";
import type { AiReviewInboxTab } from "../types/aiReviewInbox.types";
import { designMatchesInboxTab } from "./aiReviewInboxEligibility";
import { resolveAdvanceIndexAfterInboxRemoval } from "./aiReviewInboxSelection";

export type AiReviewInboxManualAction = "approve" | "reject" | "archive";

export type AiReviewTabCountDeltas = Partial<Record<AiReviewInboxTab, number>>;

/**
 * Local tab-count adjustments after a successful manual inbox action.
 * Only covers the transitions the AI Review UI can perform today
 * (approve/reject from Needs Review; archive from Rejected).
 */
export function computeAiReviewInboxActionCountDeltas(input: {
  action: AiReviewInboxManualAction;
  sourceTab: AiReviewInboxTab;
}): AiReviewTabCountDeltas {
  if (input.action === "approve" && input.sourceTab === "needs_review") {
    return { needs_review: -1 };
  }

  if (input.action === "reject" && input.sourceTab === "needs_review") {
    return { needs_review: -1, rejected: 1 };
  }

  if (input.action === "archive" && input.sourceTab === "rejected") {
    return { rejected: -1 };
  }

  return {};
}

/**
 * Fields that drive inbox tab membership + display after a successful action.
 * Full document authority remains on the service return; this is the local list patch.
 */
export function buildAiReviewInboxLocalDesignPatch(design: Design): Partial<Design> {
  return {
    status: design.status,
    aiReviewStatus: design.aiReviewStatus,
    aiReviewed: design.aiReviewed,
    aiProcessed: design.aiProcessed,
    aiReviewedBy: design.aiReviewedBy,
    aiReviewVersion: design.aiReviewVersion,
    aiReviewNotes: design.aiReviewNotes,
    aiReviewConfidence: design.aiReviewConfidence,
    title: design.title,
    description: design.description,
    categoryId: design.categoryId,
    tags: design.tags,
    artworkBackgroundHex: design.artworkBackgroundHex,
    updatedAt: design.updatedAt,
    updatedBy: design.updatedBy,
  };
}

export function applyAiReviewTabCountDeltas(
  counts: Record<AiReviewInboxTab, number | null>,
  deltas: AiReviewTabCountDeltas,
): Record<AiReviewInboxTab, number | null> {
  const next: Record<AiReviewInboxTab, number | null> = { ...counts };

  for (const tab of Object.keys(deltas) as AiReviewInboxTab[]) {
    const delta = deltas[tab];
    if (delta === undefined) {
      continue;
    }

    const current = next[tab];
    if (typeof current !== "number") {
      continue;
    }

    next[tab] = Math.max(0, current + delta);
  }

  return next;
}

export interface SuccessfulInboxManualActionReconcileDeps {
  applyDesignPatch: (designId: string, patch: Partial<Design>) => void;
  clearLiveDesign: () => void;
  onInboxCountsDelta?: (deltas: AiReviewTabCountDeltas) => void;
  /** Must NOT be called on the happy path — injected so tests can spy. */
  onQueueChanged?: () => void;
  /** Must NOT be called on the happy path — injected so tests can spy. */
  reloadDesigns?: () => Promise<void>;
  setPendingAdvanceIndex: (index: number) => void;
}

/**
 * Amendment 9 P0 happy path: local list/selection/count reconcile only.
 * Deliberately does not call reloadDesigns or onQueueChanged.
 */
export function reconcileSuccessfulInboxManualAction(input: {
  deps: SuccessfulInboxManualActionReconcileDeps;
  manualAction: AiReviewInboxManualAction;
  selectedIndex: number;
  sourceTab: AiReviewInboxTab;
  updated: Design;
}): void {
  input.deps.clearLiveDesign();
  input.deps.setPendingAdvanceIndex(input.selectedIndex);
  input.deps.applyDesignPatch(
    input.updated.id,
    buildAiReviewInboxLocalDesignPatch(input.updated),
  );
  input.deps.onInboxCountsDelta?.(
    computeAiReviewInboxActionCountDeltas({
      action: input.manualAction,
      sourceTab: input.sourceTab,
    }),
  );
}

export interface SuccessfulHardDeleteReconcileDeps {
  clearLiveDesign: () => void;
  onInboxCountsDelta?: (deltas: AiReviewTabCountDeltas) => void;
  removeDesignFromList: (designId: string) => void;
  setPendingAdvanceIndex: (index: number) => void;
}

/** Local tab badge delta after Option B hard delete from an AI Review inbox tab. */
export function computeHardDeleteCountDeltas(
  sourceTab: AiReviewInboxTab,
): AiReviewTabCountDeltas {
  if (
    sourceTab === "processing" ||
    sourceTab === "needs_review" ||
    sourceTab === "rejected"
  ) {
    return { [sourceTab]: -1 };
  }

  return {};
}

/**
 * Option B happy path: remove the deleted id from the local inbox list immediately,
 * clear live selection state, advance to the next row, and adjust the tab badge.
 * Does not call reloadDesigns (avoids clearing the list into a stale 15s page-cache hit).
 */
export function reconcileSuccessfulHardDelete(input: {
  deps: SuccessfulHardDeleteReconcileDeps;
  designId: string;
  selectedIndex: number;
  sourceTab: AiReviewInboxTab;
}): void {
  input.deps.clearLiveDesign();
  input.deps.setPendingAdvanceIndex(input.selectedIndex);
  input.deps.removeDesignFromList(input.designId);
  input.deps.onInboxCountsDelta?.(computeHardDeleteCountDeltas(input.sourceTab));
}

export interface FailedInboxManualActionRecoverDeps {
  clearPendingAdvance: () => void;
  onQueueChanged?: () => void;
  reloadDesigns: () => Promise<void>;
}

/**
 * Amendment 9 P0 failure path: one bounded list reload + one three-tab count refresh.
 */
export async function recoverFailedInboxManualAction(
  deps: FailedInboxManualActionRecoverDeps,
): Promise<void> {
  deps.clearPendingAdvance();
  await deps.reloadDesigns();
  deps.onQueueChanged?.();
}

/**
 * Simulate N successful Needs Review approvals using the real reconcile helper + selection
 * advance. Injected reloadDesigns/onQueueChanged spies prove the happy path never touches them.
 */
export function simulateLocalNeedsReviewApprovals(designIds: string[]): {
  remainingIds: string[];
  selectionSequence: Array<string | null>;
  listReloadCallCount: number;
  countRefreshCallCount: number;
  applyPatchCount: number;
  needsReviewDeltaSum: number;
} {
  let remainingIds = [...designIds];
  let selectedIndex = remainingIds.length > 0 ? 0 : -1;
  const selectionSequence: Array<string | null> = [];
  let listReloadCallCount = 0;
  let countRefreshCallCount = 0;
  let applyPatchCount = 0;
  let needsReviewDeltaSum = 0;

  while (remainingIds.length > 0 && selectedIndex >= 0) {
    const removedId = remainingIds[selectedIndex]!;
    const removedIndex = selectedIndex;

    reconcileSuccessfulInboxManualAction({
      updated: {
        id: removedId,
        title: removedId,
        tags: [],
        status: "ready",
        originalPath: `/originals/${removedId}.png`,
        thumbnailPath: `/thumbnails/${removedId}.webp`,
        uploadedBy: "user-1",
        queueCount: 0,
        aiProcessed: true,
        aiReviewed: true,
        aiReviewStatus: "approved",
        createdBy: "user-1",
        updatedBy: "user-1",
        createdAt: { toMillis: () => 1, toDate: () => new Date() } as Design["createdAt"],
        updatedAt: { toMillis: () => 1, toDate: () => new Date() } as Design["updatedAt"],
      },
      manualAction: "approve",
      sourceTab: "needs_review",
      selectedIndex: removedIndex,
      deps: {
        clearLiveDesign: () => undefined,
        setPendingAdvanceIndex: () => undefined,
        applyDesignPatch: () => {
          applyPatchCount += 1;
        },
        onInboxCountsDelta: (deltas) => {
          needsReviewDeltaSum += deltas.needs_review ?? 0;
        },
        reloadDesigns: async () => {
          listReloadCallCount += 1;
        },
        onQueueChanged: () => {
          countRefreshCallCount += 1;
        },
      },
    });

    remainingIds = remainingIds.filter((_, index) => index !== removedIndex);
    const nextIndex = resolveAdvanceIndexAfterInboxRemoval(remainingIds.length, removedIndex);
    selectedIndex = nextIndex ?? -1;
    selectionSequence.push(selectedIndex >= 0 ? remainingIds[selectedIndex]! : null);
  }

  return {
    remainingIds,
    selectionSequence,
    listReloadCallCount,
    countRefreshCallCount,
    applyPatchCount,
    needsReviewDeltaSum,
  };
}

export function designLeavesCurrentInboxTab(
  design: Design,
  tab: AiReviewInboxTab,
): boolean {
  return !designMatchesInboxTab(design, tab);
}
