import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "./admin";
import { withoutUndefinedFields } from "./firestoreDocument";

const BATCH_LIMIT = 400;

async function reassignCollectionByCustomerId(input: {
  collectionName: string;
  sourceCustomerId: string;
  survivorCustomerId: string;
  survivorAuthUid: string | null;
  cursor?: string | null;
  extraFields?: Record<string, string>;
}): Promise<{ processed: number; nextCursor: string | null; complete: boolean }> {
  let query = adminDb
    .collection(input.collectionName)
    .where("customerId", "==", input.sourceCustomerId)
    .orderBy("__name__")
    .limit(BATCH_LIMIT);

  if (input.cursor) {
    query = query.startAfter(input.cursor);
  }

  const snapshot = await query.get();
  if (snapshot.empty) {
    return { processed: 0, nextCursor: null, complete: true };
  }

  const batch = adminDb.batch();
  const timestamp = FieldValue.serverTimestamp();

  for (const doc of snapshot.docs) {
    batch.update(
      doc.ref,
      withoutUndefinedFields({
        customerId: input.survivorCustomerId,
        ...(input.survivorAuthUid ? { customerUid: input.survivorAuthUid } : {}),
        ...input.extraFields,
        updatedAt: timestamp,
      }),
    );
  }

  await batch.commit();

  const lastId = snapshot.docs[snapshot.docs.length - 1]?.id ?? null;
  return {
    processed: snapshot.size,
    nextCursor: lastId,
    complete: snapshot.size < BATCH_LIMIT,
  };
}

export async function reassignPrintRequestsBatch(input: {
  sourceCustomerId: string;
  survivorCustomerId: string;
  cursor?: string | null;
}): Promise<{ processed: number; nextCursor: string | null; complete: boolean }> {
  return reassignCollectionByCustomerId({
    collectionName: "printRequests",
    sourceCustomerId: input.sourceCustomerId,
    survivorCustomerId: input.survivorCustomerId,
    survivorAuthUid: null,
    cursor: input.cursor,
  });
}

export async function reassignShowAllocationsBatch(input: {
  sourceCustomerId: string;
  survivorCustomerId: string;
  cursor?: string | null;
}): Promise<{ processed: number; nextCursor: string | null; complete: boolean }> {
  return reassignCollectionByCustomerId({
    collectionName: "showAllocations",
    sourceCustomerId: input.sourceCustomerId,
    survivorCustomerId: input.survivorCustomerId,
    survivorAuthUid: null,
    cursor: input.cursor,
  });
}

export async function reassignCustomerUploadsMetadataBatch(input: {
  sourceCustomerId: string;
  survivorCustomerId: string;
  survivorAuthUid: string | null;
  cursor?: string | null;
}): Promise<{ processed: number; nextCursor: string | null; complete: boolean }> {
  return reassignCollectionByCustomerId({
    collectionName: "customerUploads",
    sourceCustomerId: input.sourceCustomerId,
    survivorCustomerId: input.survivorCustomerId,
    survivorAuthUid: input.survivorAuthUid,
    cursor: input.cursor,
  });
}

export async function reassignCustomerUploadBatchesMetadataBatch(input: {
  sourceCustomerId: string;
  survivorCustomerId: string;
  survivorAuthUid: string | null;
  cursor?: string | null;
}): Promise<{ processed: number; nextCursor: string | null; complete: boolean }> {
  return reassignCollectionByCustomerId({
    collectionName: "customerUploadBatches",
    sourceCustomerId: input.sourceCustomerId,
    survivorCustomerId: input.survivorCustomerId,
    survivorAuthUid: input.survivorAuthUid,
    cursor: input.cursor,
  });
}

export async function reassignAssistedCreationBatch(input: {
  sourceCustomerId: string;
  survivorCustomerId: string;
  survivorAuthUid: string | null;
  cursor?: string | null;
}): Promise<{ processed: number; nextCursor: string | null; complete: boolean }> {
  return reassignCollectionByCustomerId({
    collectionName: "assistedCreationRequests",
    sourceCustomerId: input.sourceCustomerId,
    survivorCustomerId: input.survivorCustomerId,
    survivorAuthUid: input.survivorAuthUid,
    cursor: input.cursor,
  });
}

const MISC_COLLECTIONS = [
  "customerNotifications",
  "emailDeliveryJobs",
  "etsyRecommendationRequests",
  "etsySuggestionRequests",
  "designIssueReports",
  "customRequests",
] as const;

export async function reassignMiscCollectionsBatch(input: {
  sourceCustomerId: string;
  survivorCustomerId: string;
  survivorAuthUid: string | null;
  collectionName: (typeof MISC_COLLECTIONS)[number];
  cursor?: string | null;
}): Promise<{ processed: number; nextCursor: string | null; complete: boolean }> {
  return reassignCollectionByCustomerId({
    collectionName: input.collectionName,
    sourceCustomerId: input.sourceCustomerId,
    survivorCustomerId: input.survivorCustomerId,
    survivorAuthUid: input.survivorAuthUid,
    cursor: input.cursor,
  });
}

export { MISC_COLLECTIONS };

export async function moveFavoritesDedupe(input: {
  sourceCustomerId: string;
  survivorCustomerId: string;
}): Promise<{ moved: number; skippedDuplicates: number }> {
  let moved = 0;
  let skippedDuplicates = 0;

  for (;;) {
    const snapshot = await adminDb
      .collection(`customers/${input.sourceCustomerId}/favorites`)
      .limit(BATCH_LIMIT)
      .get();

    if (snapshot.empty) {
      break;
    }

    const batch = adminDb.batch();

    for (const doc of snapshot.docs) {
      const survivorRef = adminDb
        .collection(`customers/${input.survivorCustomerId}/favorites`)
        .doc(doc.id);
      const survivorSnap = await survivorRef.get();

      if (survivorSnap.exists) {
        batch.delete(doc.ref);
        skippedDuplicates += 1;
      } else {
        batch.set(survivorRef, {
          ...doc.data(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        batch.delete(doc.ref);
        moved += 1;
      }
    }

    await batch.commit();

    if (snapshot.size < BATCH_LIMIT) {
      break;
    }
  }

  return { moved, skippedDuplicates };
}

export async function invalidateSourceWebPushSubscriptions(
  sourceCustomerId: string,
): Promise<number> {
  let deleted = 0;

  for (;;) {
    const snapshot = await adminDb
      .collection(`customers/${sourceCustomerId}/webPushSubscriptions`)
      .limit(BATCH_LIMIT)
      .get();

    if (snapshot.empty) {
      break;
    }

    const batch = adminDb.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    deleted += snapshot.size;

    if (snapshot.size < BATCH_LIMIT) {
      break;
    }
  }

  return deleted;
}

export async function tombstoneSourceCustomer(input: {
  sourceCustomerId: string;
  survivorCustomerId: string;
  callerId: string;
  mergeJobId: string;
}): Promise<void> {
  await adminDb.collection("customers").doc(input.sourceCustomerId).set(
    {
      isMerged: true,
      mergedIntoCustomerId: input.survivorCustomerId,
      mergedAt: FieldValue.serverTimestamp(),
      mergedBy: input.callerId,
      mergeJobId: input.mergeJobId,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function tombstoneSourceUser(input: {
  sourceAuthUid: string;
  survivorCustomerId: string;
  callerId: string;
}): Promise<void> {
  await adminDb.collection("users").doc(input.sourceAuthUid).set(
    {
      isActive: false,
      isMerged: true,
      mergedIntoCustomerId: input.survivorCustomerId,
      mergedAt: FieldValue.serverTimestamp(),
      mergedBy: input.callerId,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function finalizeSurvivorMergeMetadata(input: {
  sourceCustomerId: string;
  survivorCustomerId: string;
}): Promise<void> {
  const [sourceSnap, survivorSnap] = await Promise.all([
    adminDb.collection("customers").doc(input.sourceCustomerId).get(),
    adminDb.collection("customers").doc(input.survivorCustomerId).get(),
  ]);

  const source = sourceSnap.data() ?? {};
  const survivor = survivorSnap.data() ?? {};

  const sourceSequence =
    typeof source.nextPrintRequestSequence === "number" ? source.nextPrintRequestSequence : 0;
  const survivorSequence =
    typeof survivor.nextPrintRequestSequence === "number" ? survivor.nextPrintRequestSequence : 0;

  const sourceTotal =
    typeof source.totalPrintRequests === "number" ? source.totalPrintRequests : 0;
  const survivorTotal =
    typeof survivor.totalPrintRequests === "number" ? survivor.totalPrintRequests : 0;

  const existingMerged = Array.isArray(survivor.mergedSourceCustomerIds)
    ? survivor.mergedSourceCustomerIds.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      )
    : [];

  const mergedSourceCustomerIds = existingMerged.includes(input.sourceCustomerId)
    ? existingMerged
    : [...existingMerged, input.sourceCustomerId];

  await adminDb.collection("customers").doc(input.survivorCustomerId).set(
    {
      nextPrintRequestSequence: Math.max(sourceSequence, survivorSequence),
      totalPrintRequests: sourceTotal + survivorTotal,
      mergedSourceCustomerIds,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function reassignSpecificPrintRequests(input: {
  printRequestIds: string[];
  sourceCustomerId: string;
  survivorCustomerId: string;
}): Promise<void> {
  const timestamp = FieldValue.serverTimestamp();
  const batch = adminDb.batch();

  for (const printRequestId of input.printRequestIds) {
    const ref = adminDb.collection("printRequests").doc(printRequestId);
    batch.update(ref, {
      customerId: input.survivorCustomerId,
      updatedAt: timestamp,
    });
  }

  await batch.commit();
}
