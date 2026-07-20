import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import {
  OWNER_DELETE_USER_CONFIRMATION_PHRASE,
  type OwnerDeleteUserRequest,
  type OwnerDeleteUserResponse,
  type OwnerDeleteUserSubjectKind,
} from "../../packages/shared/src/types/account/portalAccountSettings.types";
import { isOperationalWipeAllowedProjectId } from "../../packages/shared/src/types/admin/wipeOperationalTestData.types";
import { adminAuth, adminDb, adminStorage } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import {
  failedPrecondition,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";

const BATCH_LIMIT = 400;
const STORAGE_DELETE_BATCH = 100;

function assertOwnerCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only owners can permanently delete users.");
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

function parseRequest(data: unknown): OwnerDeleteUserRequest {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }

  const kind =
    "kind" in data && (data.kind === "staff" || data.kind === "customer")
      ? (data.kind as OwnerDeleteUserSubjectKind)
      : null;
  const subjectId =
    "subjectId" in data && typeof data.subjectId === "string" ? data.subjectId.trim() : "";
  const confirmationPhrase =
    "confirmationPhrase" in data && typeof data.confirmationPhrase === "string"
      ? data.confirmationPhrase.trim()
      : "";

  if (!kind) {
    throw invalidArgument('kind must be "staff" or "customer".');
  }

  if (!subjectId) {
    throw invalidArgument("Select a user to delete.");
  }

  if (confirmationPhrase !== OWNER_DELETE_USER_CONFIRMATION_PHRASE) {
    throw invalidArgument(
      `Confirmation phrase must be exactly "${OWNER_DELETE_USER_CONFIRMATION_PHRASE}".`,
    );
  }

  return { kind, subjectId, confirmationPhrase };
}

async function deleteQueryDocs(
  collectionName: string,
  field: string,
  value: string,
): Promise<number> {
  let deleted = 0;

  for (;;) {
    const snapshot = await adminDb
      .collection(collectionName)
      .where(field, "==", value)
      .limit(BATCH_LIMIT)
      .get();

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

async function deleteDocsByIds(collectionName: string, ids: string[]): Promise<number> {
  let deleted = 0;
  const unique = [...new Set(ids.filter(Boolean))];

  for (let index = 0; index < unique.length; index += BATCH_LIMIT) {
    const slice = unique.slice(index, index + BATCH_LIMIT);
    const batch = adminDb.batch();
    for (const id of slice) {
      batch.delete(adminDb.collection(collectionName).doc(id));
    }
    await batch.commit();
    deleted += slice.length;
  }

  return deleted;
}

async function deleteSubcollection(parentPath: string, subcollection: string): Promise<number> {
  let deleted = 0;

  for (;;) {
    const snapshot = await adminDb
      .collection(`${parentPath}/${subcollection}`)
      .limit(BATCH_LIMIT)
      .get();

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

async function deletePrintRequestGraph(customerId: string): Promise<Record<string, number>> {
  const deleted: Record<string, number> = {};
  const printRequestIds: string[] = [];

  for (;;) {
    const snapshot = await adminDb
      .collection("printRequests")
      .where("customerId", "==", customerId)
      .limit(BATCH_LIMIT)
      .get();

    if (snapshot.empty) {
      break;
    }

    for (const document of snapshot.docs) {
      printRequestIds.push(document.id);
    }

    const batch = adminDb.batch();
    for (const document of snapshot.docs) {
      batch.delete(document.ref);
    }
    await batch.commit();
    deleted.printRequests = (deleted.printRequests ?? 0) + snapshot.size;

    if (snapshot.size < BATCH_LIMIT) {
      break;
    }
  }

  for (const printRequestId of printRequestIds) {
    deleted.printRequestItems =
      (deleted.printRequestItems ?? 0) +
      (await deleteQueryDocs("printRequestItems", "printRequestId", printRequestId));
    deleted.showAllocations =
      (deleted.showAllocations ?? 0) +
      (await deleteQueryDocs("showAllocations", "printRequestId", printRequestId));
    deleted.gangSheets =
      (deleted.gangSheets ?? 0) + (await deleteQueryDocs("gangSheets", "printRequestId", printRequestId));
  }

  // Allocations may also be keyed by customerId without surviving request docs.
  deleted.showAllocations =
    (deleted.showAllocations ?? 0) +
    (await deleteQueryDocs("showAllocations", "customerId", customerId));

  return deleted;
}

async function adjustShowAllocationTotals(showIds: string[]): Promise<void> {
  const unique = [...new Set(showIds.filter(Boolean))];

  for (const showId of unique) {
    const allocations = await adminDb
      .collection("showAllocations")
      .where("upcomingShowId", "==", showId)
      .get();

    let total = 0;
    for (const document of allocations.docs) {
      const quantity = document.data().quantity;
      if (typeof quantity === "number" && Number.isFinite(quantity)) {
        total += quantity;
      }
    }

    await adminDb.collection("upcomingShows").doc(showId).set(
      {
        allocatedQuantity: total,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
}

async function collectShowIdsForCustomer(customerId: string): Promise<string[]> {
  const snapshot = await adminDb
    .collection("showAllocations")
    .where("customerId", "==", customerId)
    .get();

  return snapshot.docs
    .map((document) => {
      const value = document.data().upcomingShowId;
      return typeof value === "string" ? value : "";
    })
    .filter(Boolean);
}

async function deleteCustomerOwnedData(options: {
  customerId: string;
  authUid: string | null;
  username: string | null;
}): Promise<{ deleted: Record<string, number>; storageFilesDeleted: number }> {
  const deleted: Record<string, number> = {};
  let storageFilesDeleted = 0;

  const showIds = await collectShowIdsForCustomer(options.customerId);
  Object.assign(deleted, await deletePrintRequestGraph(options.customerId));
  await adjustShowAllocationTotals(showIds);

  if (options.authUid) {
    deleted.customerUploads =
      (deleted.customerUploads ?? 0) +
      (await deleteQueryDocs("customerUploads", "customerUid", options.authUid));
    deleted.customerUploadBatches =
      (deleted.customerUploadBatches ?? 0) +
      (await deleteQueryDocs("customerUploadBatches", "customerUid", options.authUid));
    deleted.assistedCreationRequests =
      (deleted.assistedCreationRequests ?? 0) +
      (await deleteQueryDocs("assistedCreationRequests", "customerUid", options.authUid));
    deleted.customerNotifications =
      (deleted.customerNotifications ?? 0) +
      (await deleteQueryDocs("customerNotifications", "customerUid", options.authUid));
    deleted.etsyRecommendationRequests =
      (deleted.etsyRecommendationRequests ?? 0) +
      (await deleteQueryDocs("etsyRecommendationRequests", "customerUid", options.authUid));
    deleted.etsySuggestionRequests =
      (deleted.etsySuggestionRequests ?? 0) +
      (await deleteQueryDocs("etsySuggestionRequests", "customerUid", options.authUid));
    deleted.emailDeliveryJobs =
      (deleted.emailDeliveryJobs ?? 0) +
      (await deleteQueryDocs("emailDeliveryJobs", "customerUid", options.authUid));
    deleted.customRequests =
      (deleted.customRequests ?? 0) +
      (await deleteQueryDocs("customRequests", "customerUid", options.authUid));

    // Daily limit docs are typically `{uid}_{yyyyMMdd}`.
    const dailyLimits = await adminDb
      .collection("printRequestDesignDailyLimits")
      .orderBy("__name__")
      .startAt(options.authUid)
      .endAt(`${options.authUid}\uf8ff`)
      .limit(BATCH_LIMIT)
      .get();
    if (!dailyLimits.empty) {
      deleted.printRequestDesignDailyLimits = await deleteDocsByIds(
        "printRequestDesignDailyLimits",
        dailyLimits.docs.map((document) => document.id),
      );
    }

    const rateLimitPrefixes = [
      "customerUploadRateLimits",
      "customerUploadIdempotency",
      "customerUploadFinalizeLeases",
    ];
    for (const collectionName of rateLimitPrefixes) {
      const snapshot = await adminDb
        .collection(collectionName)
        .orderBy("__name__")
        .startAt(options.authUid)
        .endAt(`${options.authUid}\uf8ff`)
        .limit(BATCH_LIMIT)
        .get();
      if (!snapshot.empty) {
        deleted[collectionName] = await deleteDocsByIds(
          collectionName,
          snapshot.docs.map((document) => document.id),
        );
      }
    }

    storageFilesDeleted += await deleteStoragePrefix(`customer-uploads/${options.authUid}/`);
    storageFilesDeleted += await deleteStoragePrefix(`assisted-creation/${options.authUid}/`);
  }

  deleted.customerUploadsByCustomerId =
    (deleted.customerUploadsByCustomerId ?? 0) +
    (await deleteQueryDocs("customerUploads", "customerId", options.customerId));
  deleted.customerUploadBatchesByCustomerId =
    (deleted.customerUploadBatchesByCustomerId ?? 0) +
    (await deleteQueryDocs("customerUploadBatches", "customerId", options.customerId));
  deleted.emailDeliveryJobsByCustomerId =
    (deleted.emailDeliveryJobsByCustomerId ?? 0) +
    (await deleteQueryDocs("emailDeliveryJobs", "customerId", options.customerId));

  deleted.favorites = await deleteSubcollection(`customers/${options.customerId}`, "favorites");
  deleted.webPushSubscriptions = await deleteSubcollection(
    `customers/${options.customerId}`,
    "webPushSubscriptions",
  );

  if (options.username) {
    await adminDb.collection("customerUsernames").doc(options.username).delete().catch(() => undefined);
    deleted.customerUsernames = 1;
  }

  await adminDb.collection("customers").doc(options.customerId).delete();
  deleted.customers = 1;

  return { deleted, storageFilesDeleted };
}

async function deleteStaffOwnedData(authUid: string): Promise<Record<string, number>> {
  const deleted: Record<string, number> = {};

  deleted.staffInboxAcks = await deleteQueryDocs("staffInboxAcks", "userId", authUid);
  deleted.staffInboxAlertDeliveries = await deleteQueryDocs(
    "staffInboxAlertDeliveries",
    "userId",
    authUid,
  );

  const assistedAcks = await adminDb
    .collection("assistedCreationUpdateAcks")
    .orderBy("__name__")
    .startAt(authUid)
    .endAt(`${authUid}\uf8ff`)
    .limit(BATCH_LIMIT)
    .get();
  if (!assistedAcks.empty) {
    deleted.assistedCreationUpdateAcks = await deleteDocsByIds(
      "assistedCreationUpdateAcks",
      assistedAcks.docs.map((document) => document.id),
    );
  }

  return deleted;
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }

  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }

  throw failedPrecondition("Unable to delete the user right now.");
}

export const ownerDeleteUser = onCall(
  { timeoutSeconds: 540, memory: "512MiB" },
  async (request): Promise<OwnerDeleteUserResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const projectId = resolveProjectId();
      if (!projectId || !isOperationalWipeAllowedProjectId(projectId)) {
        throw failedPrecondition(
          "Owner user delete is only allowed on the allowlisted development Firebase project.",
        );
      }

      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);

      const payload = parseRequest(request.data);
      const deleted: Record<string, number> = {};
      let storageFilesDeleted = 0;
      let authUidDeleted: string | null = null;

      if (payload.kind === "staff") {
        if (payload.subjectId === request.auth.uid) {
          throw invalidArgument("You cannot delete your own account.");
        }

        const userRef = adminDb.collection("users").doc(payload.subjectId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
          throw invalidArgument("Staff user not found.");
        }

        const role = userSnap.data()?.role;
        if (role === "customer") {
          throw invalidArgument("Use the Customers tab to delete customer accounts.");
        }

        if (role === "owner") {
          const owners = await adminDb
            .collection("users")
            .where("role", "==", "owner")
            .where("isActive", "==", true)
            .limit(3)
            .get();
          if (owners.size <= 1) {
            throw failedPrecondition("Cannot delete the last active owner account.");
          }
        }

        Object.assign(deleted, await deleteStaffOwnedData(payload.subjectId));
        await userRef.delete();
        deleted.users = 1;
        authUidDeleted = payload.subjectId;
        await adminAuth.deleteUser(payload.subjectId).catch((error) => {
          console.error("Failed to delete Auth user for staff.", {
            uid: payload.subjectId,
            message: error instanceof Error ? error.message : "unknown",
          });
        });
      } else {
        const customerRef = adminDb.collection("customers").doc(payload.subjectId);
        const customerSnap = await customerRef.get();
        if (!customerSnap.exists) {
          throw invalidArgument("Customer not found.");
        }

        const customerData = customerSnap.data() ?? {};
        const authUid =
          typeof customerData.userId === "string" && customerData.userId.trim()
            ? customerData.userId.trim()
            : null;
        const username =
          typeof customerData.username === "string" && customerData.username.trim()
            ? customerData.username.trim().toLowerCase()
            : null;

        if (authUid && authUid === request.auth.uid) {
          throw invalidArgument("You cannot delete your own account.");
        }

        const cascade = await deleteCustomerOwnedData({
          customerId: payload.subjectId,
          authUid,
          username,
        });
        Object.assign(deleted, cascade.deleted);
        storageFilesDeleted += cascade.storageFilesDeleted;

        if (authUid) {
          await adminDb.collection("accountDeletionRequests").doc(authUid).delete().catch(() => undefined);
          deleted.accountDeletionRequests = (deleted.accountDeletionRequests ?? 0) + 1;
          await adminDb.collection("users").doc(authUid).delete().catch(() => undefined);
          deleted.users = (deleted.users ?? 0) + 1;
          authUidDeleted = authUid;
          await adminAuth.deleteUser(authUid).catch((error) => {
            console.error("Failed to delete Auth user for customer.", {
              uid: authUid,
              message: error instanceof Error ? error.message : "unknown",
            });
          });
        }
      }

      return {
        projectId,
        kind: payload.kind,
        subjectId: payload.subjectId,
        authUidDeleted,
        deleted,
        storageFilesDeleted,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
