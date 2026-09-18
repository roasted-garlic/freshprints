import type { Transaction } from "firebase-admin/firestore";

import {
  getOriginalStoragePath,
  getPreviewStoragePath,
  getThumbnailStoragePath,
} from "../../../packages/shared/src/constants/design/designStoragePaths";

import { adminDb, adminStorage } from "./admin";
import { storageObjectPath } from "./storageObjectPath";

export interface DesignStorageCleanupResult {
  deletedCount: number;
  failedPaths: string[];
}

/**
 * Reference checks shared by pre-ready design lifecycle operations.
 * The caller remains responsible for any source-provenance-specific blocker.
 */
export async function collectDesignReferenceBlockers(designId: string): Promise<string[]> {
  const blockers: string[] = [];

  const [printItems, showAllocations, companionLinks] = await Promise.all([
    adminDb.collection("printRequestItems").where("designId", "==", designId).limit(1).get(),
    adminDb.collection("showAllocations").where("designId", "==", designId).limit(1).get(),
    adminDb.collection("companionLinks").where("designIds", "array-contains", designId).limit(1).get(),
  ]);

  if (!printItems.empty) {
    blockers.push("Referenced by one or more print request items.");
  }

  if (!showAllocations.empty) {
    blockers.push("Referenced by one or more show allocations.");
  }

  if (!companionLinks.empty) {
    blockers.push("Linked in a companion relationship.");
  }

  return blockers;
}

/** Read the same blockers inside a Firestore transaction before its writes. */
export async function collectDesignReferenceBlockersInTransaction(
  transaction: Transaction,
  designId: string,
): Promise<string[]> {
  const blockers: string[] = [];

  const printItems = await transaction
    .get(adminDb.collection("printRequestItems").where("designId", "==", designId).limit(1));
  const showAllocations = await transaction
    .get(adminDb.collection("showAllocations").where("designId", "==", designId).limit(1));
  const companionLinks = await transaction
    .get(adminDb.collection("companionLinks").where("designIds", "array-contains", designId).limit(1));

  if (!printItems.empty) {
    blockers.push("Referenced by one or more print request items.");
  }

  if (!showAllocations.empty) {
    blockers.push("Referenced by one or more show allocations.");
  }

  if (!companionLinks.empty) {
    blockers.push("Linked in a companion relationship.");
  }

  return blockers;
}

/**
 * Delete only canonical derived-design objects. Missing objects are safe to retry; other
 * failures are returned so a caller can fail closed before changing the authoritative link.
 */
export async function deleteDesignStorageAssets(
  designId: string,
): Promise<DesignStorageCleanupResult> {
  const candidates = [
    getOriginalStoragePath(designId),
    getThumbnailStoragePath(designId),
    getPreviewStoragePath(designId),
  ];

  let deletedCount = 0;
  const failedPaths: string[] = [];

  for (const canonicalPath of candidates) {
    const objectPath = storageObjectPath(canonicalPath);
    try {
      await adminStorage.bucket().file(objectPath).delete({ ignoreNotFound: true });
      deletedCount += 1;
    } catch {
      failedPaths.push(canonicalPath);
    }
  }

  return { deletedCount, failedPaths };
}
