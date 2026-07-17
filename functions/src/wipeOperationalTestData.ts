import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  isOperationalWipeAllowedProjectId,
  isOperationalWipeTarget,
  OPERATIONAL_WIPE_CONFIRMATION_PHRASE,
  type OperationalWipeTarget,
  type WipeOperationalTestDataRequest,
  type WipeOperationalTestDataResponse,
} from "../../packages/shared/src/types/admin/wipeOperationalTestData.types";
import {
  CUSTOMER_UPLOAD_STORAGE_WIPE_PREFIXES,
  DESIGN_STORAGE_WIPE_PREFIXES,
  ASSISTED_CREATION_STORAGE_WIPE_PREFIXES,
  expandOperationalWipePlan,
  getDesignsWipePrerequisiteError,
} from "../../packages/shared/src/utils/operationalWipeTargets";
import { adminDb, adminStorage } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { failedPrecondition, invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";

const INTERNAL_PRINT_REQUEST_COUNTER_ID = "printRequests";
const BATCH_LIMIT = 400;
const STORAGE_DELETE_BATCH = 100;

function assertOwnerCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only owners can wipe operational test data.");
  }
}

function resolveProjectId(): string {
  const fromEnv = process.env.GCLOUD_PROJECT?.trim() || process.env.GCP_PROJECT?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  try {
    const parsed = JSON.parse(process.env.FIREBASE_CONFIG ?? "{}") as { projectId?: string };
    if (typeof parsed.projectId === "string" && parsed.projectId.trim()) {
      return parsed.projectId.trim();
    }
  } catch {
    // ignore
  }

  return "";
}

function parseRequest(data: unknown): WipeOperationalTestDataRequest {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }

  const confirmationPhrase =
    "confirmationPhrase" in data && typeof data.confirmationPhrase === "string"
      ? data.confirmationPhrase.trim()
      : "";

  if (confirmationPhrase !== OPERATIONAL_WIPE_CONFIRMATION_PHRASE) {
    throw invalidArgument(
      `Confirmation phrase must be exactly "${OPERATIONAL_WIPE_CONFIRMATION_PHRASE}".`,
    );
  }

  const rawTargets = "targets" in data && Array.isArray(data.targets) ? data.targets : [];
  const targets: OperationalWipeTarget[] = [];

  for (const entry of rawTargets) {
    if (typeof entry !== "string" || !isOperationalWipeTarget(entry)) {
      throw invalidArgument("One or more wipe targets are invalid.");
    }

    if (!targets.includes(entry)) {
      targets.push(entry);
    }
  }

  if (targets.length === 0) {
    throw invalidArgument("Select at least one wipe target.");
  }

  const designsPrerequisiteError = getDesignsWipePrerequisiteError(targets);
  if (designsPrerequisiteError) {
    throw invalidArgument(designsPrerequisiteError);
  }

  const acknowledgeDesignCatalogWipe =
    "acknowledgeDesignCatalogWipe" in data && data.acknowledgeDesignCatalogWipe === true;

  if (targets.includes("designs") && !acknowledgeDesignCatalogWipe) {
    throw invalidArgument(
      "Wiping designs requires acknowledging the design catalog wipe confirmation.",
    );
  }

  return {
    confirmationPhrase,
    targets,
    acknowledgeDesignCatalogWipe: targets.includes("designs") ? true : undefined,
  };
}

async function deleteEntireCollection(collectionName: string): Promise<number> {
  let deleted = 0;

  for (;;) {
    const snapshot = await adminDb.collection(collectionName).limit(BATCH_LIMIT).get();

    if (snapshot.empty) {
      break;
    }

    const batch = adminDb.batch();
    for (const document of snapshot.docs) {
      batch.delete(document.ref);
    }
    await batch.commit();
    deleted += snapshot.size;

    if (snapshot.size < BATCH_LIMIT) {
      break;
    }
  }

  return deleted;
}

async function resetCustomerSequences(): Promise<number> {
  let resetCount = 0;
  let lastDocId: string | undefined;

  for (;;) {
    let query = adminDb.collection("customers").orderBy("__name__").limit(BATCH_LIMIT);
    if (lastDocId) {
      query = query.startAfter(lastDocId);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      break;
    }

    const batch = adminDb.batch();
    for (const document of snapshot.docs) {
      batch.update(document.ref, {
        nextPrintRequestSequence: 1,
        totalPrintRequests: 0,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    resetCount += snapshot.size;
    lastDocId = snapshot.docs[snapshot.docs.length - 1]?.id;

    if (snapshot.size < BATCH_LIMIT) {
      break;
    }
  }

  const counterRef = adminDb.collection("counters").doc(INTERNAL_PRINT_REQUEST_COUNTER_ID);
  const counterSnapshot = await counterRef.get();

  // Remove the counter doc entirely (Admin SDK). Next internal request recreate starts at 1.
  if (counterSnapshot.exists) {
    await counterRef.delete();
  }

  return resetCount;
}

const SHOW_PRODUCTION_STATUSES_RESET_TO_OPEN = new Set([
  "full",
  "printing",
  "fully_printed",
  "completed",
]);

async function resetUpcomingShowAllocationTotals(): Promise<number> {
  let resetCount = 0;
  let lastDocId: string | undefined;

  for (;;) {
    let query = adminDb.collection("upcomingShows").orderBy("__name__").limit(BATCH_LIMIT);
    if (lastDocId) {
      query = query.startAfter(lastDocId);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      break;
    }

    const batch = adminDb.batch();
    for (const document of snapshot.docs) {
      const data = document.data();
      const patch: Record<string, unknown> = {
        allocatedQuantity: 0,
        accumulatedPrintMs: 0,
        activePrintStartedAt: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      // After wiping allocations, re-open queueable production states so shows can accept
      // new requests. Leave archived/canceled alone — those are intentional schedule hides.
      if (
        typeof data.productionStatus === "string" &&
        SHOW_PRODUCTION_STATUSES_RESET_TO_OPEN.has(data.productionStatus)
      ) {
        patch.productionStatus = "open";
      }

      batch.update(document.ref, patch);
    }
    await batch.commit();
    resetCount += snapshot.size;
    lastDocId = snapshot.docs[snapshot.docs.length - 1]?.id;

    if (snapshot.size < BATCH_LIMIT) {
      break;
    }
  }

  return resetCount;
}

async function resetDesignRequestStats(): Promise<number> {
  let resetCount = 0;
  let lastDocId: string | undefined;

  for (;;) {
    let query = adminDb.collection("designs").orderBy("__name__").limit(BATCH_LIMIT);
    if (lastDocId) {
      query = query.startAfter(lastDocId);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      break;
    }

    const batch = adminDb.batch();
    for (const document of snapshot.docs) {
      batch.update(document.ref, {
        requestCount: 0,
        lastRequestedAt: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    resetCount += snapshot.size;
    lastDocId = snapshot.docs[snapshot.docs.length - 1]?.id;

    if (snapshot.size < BATCH_LIMIT) {
      break;
    }
  }

  return resetCount;
}

async function deleteStoragePrefix(prefix: string): Promise<number> {
  const bucket = adminStorage.bucket();
  let deleted = 0;

  for (;;) {
    const [files] = await bucket.getFiles({ prefix, maxResults: STORAGE_DELETE_BATCH });

    if (files.length === 0) {
      break;
    }

    await Promise.all(files.map((file) => file.delete({ ignoreNotFound: true })));
    deleted += files.length;

    if (files.length < STORAGE_DELETE_BATCH) {
      break;
    }
  }

  return deleted;
}

async function deleteDesignStorageAssets(): Promise<number> {
  let deleted = 0;

  for (const prefix of DESIGN_STORAGE_WIPE_PREFIXES) {
    deleted += await deleteStoragePrefix(prefix);
  }

  return deleted;
}

async function deleteCustomerUploadStorageAssets(): Promise<number> {
  let deleted = 0;

  for (const prefix of CUSTOMER_UPLOAD_STORAGE_WIPE_PREFIXES) {
    deleted += await deleteStoragePrefix(prefix);
  }

  return deleted;
}

async function deleteAssistedCreationStorageAssets(): Promise<number> {
  let deleted = 0;

  for (const prefix of ASSISTED_CREATION_STORAGE_WIPE_PREFIXES) {
    deleted += await deleteStoragePrefix(prefix);
  }

  return deleted;
}

export const wipeOperationalTestData = onCall(
  { timeoutSeconds: 540, memory: "512MiB" },
  async (request): Promise<WipeOperationalTestDataResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const projectId = resolveProjectId();
    if (!projectId || !isOperationalWipeAllowedProjectId(projectId)) {
      throw failedPrecondition(
        "Operational test-data wipe is only allowed on the allowlisted development Firebase project.",
      );
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertOwnerCaller(caller);

    const { targets } = parseRequest(request.data);
    const plan = expandOperationalWipePlan(targets);

    if (
      plan.deleteCollections.length === 0 &&
      !plan.resetSequences &&
      !plan.resetDesignRequestStats &&
      !plan.wipeDesignStorage &&
      !plan.wipeCustomerUploadStorage &&
      !plan.wipeAssistedCreationStorage &&
      !plan.resetShowAllocationTotals
    ) {
      throw invalidArgument("Select at least one wipe target.");
    }

    const deleted: Record<string, number> = {};

    for (const collectionName of plan.deleteCollections) {
      deleted[collectionName] = await deleteEntireCollection(collectionName);
    }

    const customersReset = plan.resetSequences ? await resetCustomerSequences() : 0;
    const showsAllocationTotalsReset = plan.resetShowAllocationTotals
      ? await resetUpcomingShowAllocationTotals()
      : 0;
    const designsRequestStatsReset = plan.resetDesignRequestStats
      ? await resetDesignRequestStats()
      : 0;
    let storageFilesDeleted = 0;
    if (plan.wipeDesignStorage) {
      storageFilesDeleted += await deleteDesignStorageAssets();
    }
    if (plan.wipeCustomerUploadStorage) {
      storageFilesDeleted += await deleteCustomerUploadStorageAssets();
    }
    if (plan.wipeAssistedCreationStorage) {
      storageFilesDeleted += await deleteAssistedCreationStorageAssets();
    }

    return {
      projectId,
      targets,
      deleted,
      customersReset,
      internalSequenceReset: plan.resetSequences,
      designsRequestStatsReset,
      storageFilesDeleted,
      showsAllocationTotalsReset,
    };
  },
);
