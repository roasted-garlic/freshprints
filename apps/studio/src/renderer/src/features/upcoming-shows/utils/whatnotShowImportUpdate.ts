export interface WhatnotImportExistingRecord {
  source?: unknown;
  whatnotShowId?: unknown;
  [key: string]: unknown;
}

export interface WhatnotImportUpdateInput {
  existingShowId: string;
  expectedWhatnotShowId: string;
  title: string;
  whatnotUrl?: string;
  scheduledStartAt?: unknown;
  sourceBaseUrlSnapshot?: string;
  candidateStatus: "ready" | "live";
}

export interface WhatnotImportUpdatePlan {
  targetDocumentId: string;
  payload: {
    title: string;
    whatnotUrl?: string;
    scheduledStartAt?: unknown;
    sourceBaseUrlSnapshot?: string;
  };
}

function isSupportedTimestamp(value: unknown): boolean {
  if (!value || typeof value !== "object" || !("toDate" in value)) {
    return false;
  }
  const toDate = (value as { toDate?: unknown }).toDate;
  if (typeof toDate !== "function") {
    return false;
  }
  try {
    const date = toDate.call(value);
    return date instanceof Date && Number.isFinite(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Builds the exact Whatnot-owned update for one scanner-matched Firestore document.
 * Internal show fields are deliberately absent so updateDoc preserves capacity, allocations,
 * lifecycle/production state, notes, and staff metadata without migration defaults.
 */
export function planWhatnotImportExistingShowUpdate(
  existing: WhatnotImportExistingRecord | null,
  input: WhatnotImportUpdateInput,
): WhatnotImportUpdatePlan {
  const targetDocumentId = input.existingShowId.trim();
  if (!targetDocumentId || targetDocumentId.includes("/") || !existing) {
    throw new Error("The matched upcoming show could not be resolved.");
  }

  const expectedWhatnotShowId = input.expectedWhatnotShowId.trim();
  if (!expectedWhatnotShowId) {
    throw new Error("Whatnot show identifier is missing.");
  }
  if (existing.source !== "whatnot") {
    throw new Error("The matched upcoming show source is invalid.");
  }
  if (typeof existing.whatnotShowId !== "string" || !existing.whatnotShowId.trim()) {
    throw new Error("The matched upcoming show is missing its Whatnot show identifier.");
  }
  if (existing.whatnotShowId.trim() !== expectedWhatnotShowId) {
    throw new Error("The matched upcoming show no longer matches this Whatnot show.");
  }

  const title = input.title.trim();
  if (!title) {
    throw new Error("Show title is missing.");
  }
  if (input.candidateStatus === "ready" && !isSupportedTimestamp(input.scheduledStartAt)) {
    throw new Error("Scheduled show time is missing or invalid.");
  }
  if (input.scheduledStartAt !== undefined && !isSupportedTimestamp(input.scheduledStartAt)) {
    throw new Error("Scheduled show time is missing or invalid.");
  }

  return {
    targetDocumentId,
    payload: {
      title,
      ...(input.whatnotUrl ? { whatnotUrl: input.whatnotUrl } : {}),
      ...(input.scheduledStartAt !== undefined ? { scheduledStartAt: input.scheduledStartAt } : {}),
      ...(input.sourceBaseUrlSnapshot
        ? { sourceBaseUrlSnapshot: input.sourceBaseUrlSnapshot }
        : {}),
    },
  };
}
