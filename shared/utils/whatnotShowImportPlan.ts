import type { ParsedWhatnotShowImportCandidate } from "./whatnotShowImportCandidate";

export type WhatnotShowImportAction = "create" | "update" | "unchanged" | "needs_review";

/**
 * Plain, IPC-safe summary of an existing local show, used to classify a scan's candidates as
 * create/update/unchanged. Deliberately not `UpcomingShow` itself — `UpcomingShow.scheduledStartAt`
 * is a Firestore `Timestamp` class instance, which loses its prototype (and so `.toDate()`) when
 * structured-cloned across `ipcRenderer.invoke`. Callers must convert to this shape (epoch ms, a
 * plain number) in the renderer before sending, never rely on a `Timestamp` surviving the trip.
 */
export interface WhatnotExistingShowSummary {
  id: string;
  whatnotShowId: string;
  title?: string;
  whatnotUrl?: string;
  scheduledStartAtMs?: number;
}

export interface WhatnotShowImportPlanEntry {
  action: WhatnotShowImportAction;
  candidate: ParsedWhatnotShowImportCandidate;
  existingShowId?: string;
}

/**
 * Classifies each parsed candidate against existing local shows (matched by `whatnotShowId`,
 * mirroring the manual "Add Show" upsert contract). Never mutates or returns Firestore writes
 * itself — purely a planning step so the import preview can show staff what would happen before
 * anything is written.
 */
export function planWhatnotShowImport(
  candidates: ParsedWhatnotShowImportCandidate[],
  existingShows: WhatnotExistingShowSummary[],
): WhatnotShowImportPlanEntry[] {
  return candidates.map((candidate) => {
    if (candidate.status === "needs_review" || !candidate.whatnotShowId) {
      return { action: "needs_review", candidate };
    }

    // A "live" candidate has no schedulable date/time (Whatnot only shows "Live · N" viewers),
    // but it does have a stable show ID, so it's still importable — just never gets a
    // scheduledStartAt written or compared.

    const existingShow = existingShows.find((show) => show.whatnotShowId === candidate.whatnotShowId);

    if (!existingShow) {
      return { action: "create", candidate };
    }

    const isUnchanged =
      existingShow.title === candidate.title &&
      existingShow.whatnotUrl === candidate.whatnotUrl &&
      existingShow.scheduledStartAtMs === candidate.scheduledStartAt?.getTime();

    return {
      action: isUnchanged ? "unchanged" : "update",
      candidate,
      existingShowId: existingShow.id,
    };
  });
}
