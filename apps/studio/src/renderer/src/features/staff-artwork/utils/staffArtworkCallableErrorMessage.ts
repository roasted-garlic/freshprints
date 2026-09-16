import { FirebaseError } from "firebase/app";

import { describeStaffArtworkDeletionBlockers } from "@fresh-prints/shared/utils/staffArtworkDeletionEligibility";

const MAX_DETAILS_LENGTH = 320;

function getServerDetails(error: unknown): unknown {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const value = error as {
    details?: unknown;
    customData?: { serverResponse?: { data?: { details?: unknown } } };
  };
  return value.details ?? value.customData?.serverResponse?.data?.details;
}

function formatSafeDetails(details: unknown): string | null {
  if (details === undefined || details === null) {
    return null;
  }

  if (typeof details === "object" && details !== null && "blockers" in details) {
    const blockers = (details as { blockers?: unknown }).blockers;
    if (Array.isArray(blockers) && blockers.every((entry) => typeof entry === "string")) {
      const described = describeStaffArtworkDeletionBlockers(blockers);
      if (described) {
        return described.slice(0, MAX_DETAILS_LENGTH);
      }
    }
  }

  try {
    const serialized = typeof details === "string" ? details : JSON.stringify(details);
    if (!serialized) {
      return null;
    }
    return serialized.slice(0, MAX_DETAILS_LENGTH);
  } catch {
    return null;
  }
}

/** Keep callable code/message/details visible without exposing unbounded server errors. */
export function resolveStaffArtworkCallableErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    const code = error.code.replace(/^functions\//, "");
    const message = error.message?.trim() || "Staff Artwork promotion failed.";
    const details = formatSafeDetails(getServerDetails(error));
    if (code === "failed-precondition" && details) {
      return `${message} ${details.endsWith(".") ? details : `${details}.`}`;
    }
    return `${message} [${code}]${details ? ` Details: ${details}` : ""}`;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "Unable to promote Staff Artwork.";
}
