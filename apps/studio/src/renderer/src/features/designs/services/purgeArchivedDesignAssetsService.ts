import { FirebaseError } from "firebase/app";
import { collection, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import type {
  PurgeArchivedDesignAssetsRequest,
  PurgeArchivedDesignAssetsResponse,
} from "@fresh-prints/shared/types/admin/purgeArchivedDesignAssets.types";

import { db, functions } from "../../../config/firebase";

const ACTIVE_ALLOCATION_STATUSES = new Set(["pending", "queued", "in_progress"]);

const genericCallableMessages = new Set([
  "internal",
  "unknown",
  "unavailable",
  "deadline-exceeded",
  "aborted",
  "cancelled",
  "data-loss",
  "not-found",
]);

function isGenericCallableMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return genericCallableMessages.has(normalized);
}

function getCallableErrorMessage(error: unknown, fallbackMessage: string): string {
  if (!(error instanceof FirebaseError)) {
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string" &&
      error.message.trim() &&
      !isGenericCallableMessage(error.message)
    ) {
      return error.message;
    }

    return fallbackMessage;
  }

  const message = error.message?.trim() ?? "";

  switch (error.code) {
    case "functions/unauthenticated":
      return "You must be signed in to delete archived design images.";
    case "functions/permission-denied":
      return message && !isGenericCallableMessage(message)
        ? message
        : "Only owners can delete archived design images.";
    case "functions/invalid-argument":
      return message && !isGenericCallableMessage(message)
        ? message
        : "Check the delete request and try again.";
    case "functions/failed-precondition":
      return message && !isGenericCallableMessage(message)
        ? message
        : "This design cannot have its images deleted right now.";
    case "functions/not-found":
    case "functions/unavailable":
    case "functions/internal":
      return (
        "Unable to delete archived design images. Confirm the purgeArchivedDesignAssets Cloud Function " +
        "is deployed to this Firebase project, then try again."
      );
    default:
      if (message && !isGenericCallableMessage(message)) {
        return message;
      }

      return fallbackMessage;
  }
}

export async function purgeArchivedDesignAssets(
  input: PurgeArchivedDesignAssetsRequest,
): Promise<PurgeArchivedDesignAssetsResponse> {
  try {
    const callable = httpsCallable<PurgeArchivedDesignAssetsRequest, PurgeArchivedDesignAssetsResponse>(
      functions,
      "purgeArchivedDesignAssets",
    );
    const response = await callable(input);
    return response.data;
  } catch (error) {
    throw new Error(
      getCallableErrorMessage(error, "Unable to delete archived design images. Please try again."),
    );
  }
}

/** Returns design ids that have at least one active show allocation. */
export async function findDesignIdsOnActiveShowQueue(designIds: string[]): Promise<string[]> {
  const uniqueIds = [...new Set(designIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return [];
  }

  const active = new Set<string>();
  const allocationsRef = collection(db, "showAllocations");

  for (let index = 0; index < uniqueIds.length; index += 10) {
    const chunk = uniqueIds.slice(index, index + 10);
    const snapshot = await getDocs(query(allocationsRef, where("designId", "in", chunk)));

    for (const document of snapshot.docs) {
      const data = document.data();
      const designId = typeof data.designId === "string" ? data.designId : "";
      const status = typeof data.status === "string" ? data.status : "";

      if (designId && ACTIVE_ALLOCATION_STATUSES.has(status)) {
        active.add(designId);
      }
    }
  }

  return [...active];
}
