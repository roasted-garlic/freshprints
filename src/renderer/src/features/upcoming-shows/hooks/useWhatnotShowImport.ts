import { useCallback, useEffect, useRef, useState } from "react";

import { Timestamp } from "firebase/firestore";

import { whatnotImportDesktopService } from "../../../shared/services/desktopAppService";
import { useAuth } from "../../auth/hooks/useAuth";
import { upcomingShowService } from "../services/upcomingShowService";
import type { UpcomingShow } from "../../../../../../shared/types/upcomingShow/upcomingShow.types";
import type { WhatnotShowImportConfirmedEvent } from "../../../../../../shared/types/whatnotImport/whatnotImport.types";

export type WhatnotShowImportStage = "idle" | "window_open" | "importing";

interface WhatnotShowImportState {
  stage: WhatnotShowImportStage;
  error: string | null;
}

export interface WhatnotShowImportSummary {
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
}

const INITIAL_STATE: WhatnotShowImportState = { stage: "idle", error: null };

/**
 * Owns the split Whatnot import window's lifecycle from the main app's side: opening it, and
 * reacting to the staff-confirmed selection sent back from its shell panel by performing the
 * actual Firestore writes here (the shell panel has no app code / Firebase access of its own).
 */
export function useWhatnotShowImport(existingShows: UpcomingShow[], onImported: (summary: WhatnotShowImportSummary) => void) {
  const { user } = useAuth();
  const [state, setState] = useState<WhatnotShowImportState>(INITIAL_STATE);
  const existingShowsRef = useRef(existingShows);
  existingShowsRef.current = existingShows;

  const openImportWindow = useCallback(
    async (baseUrl: string) => {
      setState({ stage: "window_open", error: null });

      try {
        await whatnotImportDesktopService.openImportWindow(baseUrl, existingShowsRef.current);
      } catch (error) {
        setState({
          stage: "idle",
          error: error instanceof Error ? error.message : "Unable to open the Whatnot import window.",
        });
      }
    },
    [],
  );

  const cancel = useCallback(async () => {
    await whatnotImportDesktopService.closeImportWindow();
    setState(INITIAL_STATE);
  }, []);

  useEffect(() => {
    const unsubscribe = whatnotImportDesktopService.onImportConfirmed(
      (event: WhatnotShowImportConfirmedEvent) => {
        void (async () => {
          if (!user) {
            await whatnotImportDesktopService.reportImportCompleted({
              status: "failed",
              error: "You must be signed in to import shows.",
            });
            return;
          }

          setState({ stage: "importing", error: null });

          const summary: WhatnotShowImportSummary = { created: 0, updated: 0, unchanged: 0, skipped: 0 };
          const excludedIndexes = new Set(event.excludedIndexes);

          try {
            for (const [index, entry] of event.planEntries.entries()) {
              if (excludedIndexes.has(index) || entry.action === "needs_review") {
                summary.skipped += 1;
                continue;
              }

              if (entry.action === "unchanged") {
                summary.unchanged += 1;
                continue;
              }

              await upcomingShowService.upsertUpcomingShow(user, {
                source: "whatnot",
                whatnotShowId: entry.candidate.whatnotShowId!,
                whatnotUrl: entry.candidate.whatnotUrl,
                title: entry.candidate.title,
                scheduledStartAt: entry.candidate.scheduledStartAt
                  ? Timestamp.fromDate(entry.candidate.scheduledStartAt)
                  : undefined,
                sourceBaseUrlSnapshot: event.baseUrl,
                fromAssistedImport: true,
              });

              if (entry.action === "create") {
                summary.created += 1;
              } else {
                summary.updated += 1;
              }
            }

            await whatnotImportDesktopService.reportImportCompleted({ status: "succeeded", summary });
            setState(INITIAL_STATE);
            onImported(summary);
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to complete the import.";
            await whatnotImportDesktopService.reportImportCompleted({ status: "failed", error: message });
            setState({ stage: "window_open", error: message });
          }
        })();
      },
    );

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    ...state,
    openImportWindow,
    cancel,
  };
}
