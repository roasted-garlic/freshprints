import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb, adminStorage } from "./admin";

const BATCH_LIMIT = 400;

async function deleteDocsByIdPrefix(collectionName: string, prefix: string): Promise<number> {
  let deleted = 0;

  for (;;) {
    const snapshot = await adminDb
      .collection(collectionName)
      .orderBy("__name__")
      .startAt(prefix)
      .endAt(`${prefix}\uf8ff`)
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

export interface HardDeleteCustomerIdentityBootstrapInput {
  customerId: string;
  authUid: string | null;
  username: string | null;
}

export interface HardDeleteCustomerIdentityBootstrapResult {
  deleted: Record<string, number>;
}

/**
 * Removes identity/bootstrap records only — never business history collections.
 */
export async function hardDeleteCustomerIdentityBootstrap(
  input: HardDeleteCustomerIdentityBootstrapInput,
): Promise<HardDeleteCustomerIdentityBootstrapResult> {
  const deleted: Record<string, number> = {};

  if (input.authUid) {
    deleted.customerUploadRateLimits = await deleteDocsByIdPrefix(
      "customerUploadRateLimits",
      `${input.authUid}_`,
    );
    deleted.customerUploadIdempotency = await deleteDocsByIdPrefix(
      "customerUploadIdempotency",
      input.authUid,
    );
    deleted.customerUploadFinalizeLeases = await deleteDocsByIdPrefix(
      "customerUploadFinalizeLeases",
      input.authUid,
    );
    deleted.printRequestDesignDailyLimits = await deleteDocsByIdPrefix(
      "printRequestDesignDailyLimits",
      input.authUid,
    );
    deleted.etsyRecommendationRateLimits = await deleteDocsByIdPrefix(
      "etsyRecommendationRateLimits",
      `${input.authUid}_`,
    );

    await adminDb.collection("accountDeletionRequests").doc(input.authUid).delete().catch(() => undefined);
    deleted.accountDeletionRequests = 1;

    await adminDb.collection("users").doc(input.authUid).delete().catch(() => undefined);
    deleted.users = 1;

    await adminAuth.deleteUser(input.authUid).catch((error) => {
      console.error("Failed to delete Auth user during history-free customer hard delete.", {
        uid: input.authUid,
        message: error instanceof Error ? error.message : "unknown",
      });
    });
    deleted.authUsers = 1;
  }

  if (input.username) {
    await adminDb.collection("customerUsernames").doc(input.username).delete().catch(() => undefined);
    deleted.customerUsernames = 1;
  }

  await adminDb.collection("customers").doc(input.customerId).delete();
  deleted.customers = 1;

  return { deleted };
}

export async function countCollectionWhereEquals(
  collectionName: string,
  field: string,
  value: string,
): Promise<number> {
  const snapshot = await adminDb.collection(collectionName).where(field, "==", value).count().get();
  return snapshot.data().count;
}

export async function hasSubcollectionDocuments(
  parentPath: string,
  subcollection: string,
): Promise<boolean> {
  const segments = parentPath.split("/").filter(Boolean);
  if (segments.length !== 2) {
    throw new Error(`Invalid customer subcollection parent path: ${parentPath}`);
  }

  const [collectionName, documentId] = segments;
  const snapshot = await adminDb
    .collection(collectionName)
    .doc(documentId)
    .collection(subcollection)
    .limit(1)
    .get();
  return !snapshot.empty;
}

export async function countStorageObjectsWithPrefix(prefix: string): Promise<number> {
  try {
    const bucket = adminStorage.bucket();
    const [files] = await bucket.getFiles({ prefix, maxResults: 1 });
    return files.length > 0 ? 1 : 0;
  } catch (error) {
    console.error("Failed to inspect Storage prefix during customer eligibility check.", {
      prefix,
      message: error instanceof Error ? error.message : "unknown",
    });
    return 0;
  }
}

export async function markCustomerHardDeleteStarted(
  customerId: string,
  lockedBy: string,
  previewChecksum: string,
): Promise<void> {
  await adminDb.collection("customers").doc(customerId).set(
    {
      identityOperationLock: {
        kind: "hard_delete",
        lockedAt: FieldValue.serverTimestamp(),
        lockedBy,
        previewChecksum,
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
