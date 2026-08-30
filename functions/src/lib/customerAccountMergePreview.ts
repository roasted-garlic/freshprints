import { createHash } from "node:crypto";

import { CUSTOMER_ACCOUNT_MERGE_STAGES } from "../../../packages/shared/src/constants/customerAccountMerge.constants";
import type {
  AccountMergeRecommendation,
  MergeContinuablePolicySummary,
  MergeInventoryCounts,
  MergeStorageMigrationInventory,
  PreviewCustomerAccountMergeResponse,
} from "../../../packages/shared/src/types/customer/customerAccountMerge.types";
import type { DeletionBlocker } from "../../../packages/shared/src/types/deletion/deletion.types";
import type { DuplicateResolutionVerificationSummary } from "../../../packages/shared/src/types/customer/customerDuplicateResolution.types";
import type { CustomerEligibilitySnapshot } from "./customerAccountEligibility";
import { buildEligibilityChecksumFromSnapshot } from "./customerIdentityEligibilitySnapshot";
import type { MergeCustomerIdentitySummary } from "../../../packages/shared/src/types/customer/customerAccountMerge.types";

export function buildAccountMergePreviewChecksum(input: {
  sourceSnapshot: CustomerEligibilitySnapshot;
  survivorSnapshot: CustomerEligibilitySnapshot;
  useSourceUsername: boolean;
  plannedSurvivorUsername: string;
  continuablePolicy: MergeContinuablePolicySummary;
  sourceInventory: MergeInventoryCounts;
  survivorInventory: MergeInventoryCounts;
  storageMigration: MergeStorageMigrationInventory;
}): string {
  const payload = {
    source: buildEligibilityChecksumFromSnapshot(input.sourceSnapshot),
    survivor: buildEligibilityChecksumFromSnapshot(input.survivorSnapshot),
    useSourceUsername: input.useSourceUsername,
    plannedSurvivorUsername: input.plannedSurvivorUsername.trim().toLowerCase(),
    sourceContinuableIds: input.continuablePolicy.sourceContinuableRequests
      .map((request) => `${request.id}:${request.itemCount}`)
      .sort(),
    survivorContinuableIds: input.continuablePolicy.survivorContinuableRequests
      .map((request) => `${request.id}:${request.itemCount}`)
      .sort(),
    emptyPrintRequestIdsToRemove: [...input.continuablePolicy.emptyPrintRequestIdsToRemove].sort(),
    sourceMeaningfulPrintRequestIdsToReassign: [
      ...input.continuablePolicy.sourceMeaningfulPrintRequestIdsToReassign,
    ].sort(),
    sourceInventoryChecksum: inventoryChecksum(input.sourceInventory),
    survivorInventoryChecksum: inventoryChecksum(input.survivorInventory),
    requiresUidMigration: input.storageMigration.requiresUidMigration,
    sourceAuthUid: input.storageMigration.sourceAuthUid,
    survivorAuthUid: input.storageMigration.survivorAuthUid,
  };

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function inventoryChecksum(counts: MergeInventoryCounts): string {
  return createHash("sha256").update(JSON.stringify(counts)).digest("hex").slice(0, 16);
}

export function buildAccountMergeRecommendation(input: {
  identityBlocked: boolean;
  continuableBlocked: boolean;
  verificationBlocked: boolean;
}): AccountMergeRecommendation {
  if (input.identityBlocked) {
    return "BLOCKED_IDENTITY_STATE";
  }
  if (input.continuableBlocked) {
    return "BLOCKED_CONTINUABLE_PRINT_REQUESTS";
  }
  if (input.verificationBlocked) {
    return "BLOCKED_VERIFICATION";
  }
  return "ELIGIBLE";
}

export function buildAccountMergeBlockers(input: {
  sourceSnapshot: CustomerEligibilitySnapshot;
  survivorSnapshot: CustomerEligibilitySnapshot;
  continuableBlockers: DeletionBlocker[];
  verificationBlocked: boolean;
  verificationReasons: string[];
}): DeletionBlocker[] {
  const blockers: DeletionBlocker[] = [...input.continuableBlockers];

  if (input.sourceSnapshot.isDeleted || input.sourceSnapshot.isMerged) {
    blockers.push({
      code: "source_identity_state",
      message: "Source account is tombstoned or already merged.",
    });
  }

  if (input.survivorSnapshot.isDeleted || input.survivorSnapshot.isMerged) {
    blockers.push({
      code: "survivor_identity_state",
      message: "Survivor account is tombstoned or already merged.",
    });
  }

  if (input.sourceSnapshot.hasIdentityOperationLock) {
    blockers.push({
      code: "source_identity_lock",
      message: "Another identity operation is in progress on the source account.",
    });
  }

  if (input.survivorSnapshot.hasIdentityOperationLock) {
    blockers.push({
      code: "survivor_identity_lock",
      message: "Another identity operation is in progress on the survivor account.",
    });
  }

  if (input.verificationBlocked) {
    for (const reason of input.verificationReasons) {
      blockers.push({
        code: "verification_blocked",
        message: reason,
      });
    }
  }

  return blockers;
}

export function buildAccountMergeSummaryLines(input: {
  useSourceUsername: boolean;
  plannedSurvivorUsername: string;
  priorSurvivorUsername: string | null;
  priorSourceUsername: string | null;
  sourcePlaceholderUsername: string | null;
  requiresStorageMigration: boolean;
}): string[] {
  const lines: string[] = [
    "Operational history from the source account will be reassigned to the survivor.",
    "The source customer document will become an inactive merge tombstone.",
    "Source Firebase Auth will be disabled permanently after storage migration completes.",
    "Source web push subscriptions will be removed (not migrated).",
  ];

  if (input.useSourceUsername) {
    lines.push(
      `Survivor will take the source username @${input.plannedSurvivorUsername}; source receives placeholder @${input.sourcePlaceholderUsername ?? "merged-src-*"}.`,
    );
  } else {
    lines.push(
      `Survivor keeps username @${input.plannedSurvivorUsername ?? input.priorSurvivorUsername ?? "unknown"}.`,
    );
    if (input.priorSourceUsername && input.sourcePlaceholderUsername) {
      lines.push(
        `Source username @${input.priorSourceUsername} will move to placeholder @${input.sourcePlaceholderUsername}.`,
      );
    }
  }

  if (input.requiresStorageMigration) {
    lines.push("Customer upload and Assisted Creation storage will be copied to the survivor Auth UID prefix.");
  }

  return lines;
}

export function buildAccountMergePreviewResponse(input: {
  source: MergeCustomerIdentitySummary;
  survivor: MergeCustomerIdentitySummary;
  useSourceUsername: boolean;
  plannedSurvivorUsername: string;
  sourcePlaceholderUsername: string | null;
  sourceInventory: MergeInventoryCounts;
  survivorInventory: MergeInventoryCounts;
  storageMigration: MergeStorageMigrationInventory;
  continuablePolicy: MergeContinuablePolicySummary;
  verification: DuplicateResolutionVerificationSummary;
  recommendation: AccountMergeRecommendation;
  blockers: DeletionBlocker[];
  previewId: string;
  previewChecksum: string;
  previewExpiresAtMillis: number;
}): PreviewCustomerAccountMergeResponse {
  const previewAllowed =
    input.recommendation === "ELIGIBLE" && input.blockers.length === 0;

  return {
    outcome: previewAllowed ? "allowed" : "blocked",
    source: input.source,
    survivor: input.survivor,
    useSourceUsername: input.useSourceUsername,
    plannedSurvivorUsername: input.plannedSurvivorUsername,
    sourcePlaceholderUsername: input.sourcePlaceholderUsername,
    sourceInventory: input.sourceInventory,
    survivorInventory: input.survivorInventory,
    storageMigration: input.storageMigration,
    continuablePolicy: input.continuablePolicy,
    verification: input.verification,
    recommendation: input.recommendation,
    blockers: input.blockers,
    mergeStageSummary: [...CUSTOMER_ACCOUNT_MERGE_STAGES],
    resolutionSummaryLines: buildAccountMergeSummaryLines({
      useSourceUsername: input.useSourceUsername,
      plannedSurvivorUsername: input.plannedSurvivorUsername,
      priorSurvivorUsername: input.survivor.username,
      priorSourceUsername: input.source.username,
      sourcePlaceholderUsername: input.sourcePlaceholderUsername,
      requiresStorageMigration: input.storageMigration.requiresUidMigration,
    }),
    previewId: input.previewId,
    previewChecksum: input.previewChecksum,
    previewExpiresAtMillis: input.previewExpiresAtMillis,
  };
}
