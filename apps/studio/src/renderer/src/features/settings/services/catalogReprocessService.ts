import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore";

import {
  CATALOG_REPROCESS_JOBS_COLLECTION,
  catalogReprocessUnavailableReason,
  isCatalogReprocessTargetEnabled,
  resolveCatalogReprocessConfirmationPhrase,
  type CatalogReprocessTargetType,
} from "@fresh-prints/shared/constants/catalogReprocess.constants";
import type {
  CatalogReprocessJobDocument,
  PreviewCatalogReprocessJobResponse,
  StartCatalogReprocessJobResponse,
} from "@fresh-prints/shared/types/admin/catalogReprocess.types";
import { db } from "../../../config/firebase";
import { callTracedFunction } from "../../../config/tracedCallable";
import { resolveStudioFirebaseEnvironment } from "./catalogWorkflowModeService";

export type CatalogReprocessJobListItem = CatalogReprocessJobDocument & { id: string };

export const catalogReprocessService = {
  getEnvironment() {
    return resolveStudioFirebaseEnvironment();
  },

  isTargetEnabled(targetType: CatalogReprocessTargetType): boolean {
    return isCatalogReprocessTargetEnabled(targetType);
  },

  unavailableReason(targetType: CatalogReprocessTargetType): string {
    return catalogReprocessUnavailableReason(targetType);
  },

  requiredPhrase(targetType: CatalogReprocessTargetType): string {
    const { isProduction } = resolveStudioFirebaseEnvironment();
    return resolveCatalogReprocessConfirmationPhrase({ targetType, isProduction });
  },

  async preview(targetType: CatalogReprocessTargetType): Promise<PreviewCatalogReprocessJobResponse> {
    return callTracedFunction<{ targetType: CatalogReprocessTargetType }, PreviewCatalogReprocessJobResponse>(
      "previewCatalogReprocessJob",
      { source: "catalogReprocessService.preview" },
    )({ targetType });
  },

  async start(input: {
    targetType: CatalogReprocessTargetType;
    confirmationPhrase: string;
    dryRun?: boolean;
    canaryDesignIds?: string[];
  }): Promise<StartCatalogReprocessJobResponse> {
    return callTracedFunction<typeof input, StartCatalogReprocessJobResponse>(
      "startCatalogReprocessJob",
      { source: "catalogReprocessService.start" },
    )(input);
  },

  async pause(jobId: string): Promise<void> {
    await callTracedFunction<{ jobId: string }, { jobId: string }>("pauseCatalogReprocessJob", {
      source: "catalogReprocessService.pause",
    })({ jobId });
  },

  async resume(jobId: string): Promise<void> {
    await callTracedFunction<{ jobId: string }, { jobId: string }>("resumeCatalogReprocessJob", {
      source: "catalogReprocessService.resume",
    })({ jobId });
  },

  async retryFailures(jobId: string): Promise<void> {
    await callTracedFunction<{ jobId: string }, { jobId: string }>(
      "retryCatalogReprocessJobFailures",
      { source: "catalogReprocessService.retryFailures" },
    )({ jobId });
  },

  subscribeRecentJobs(
    onData: (jobs: CatalogReprocessJobListItem[]) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    const jobsQuery = query(
      collection(db, CATALOG_REPROCESS_JOBS_COLLECTION),
      orderBy("updatedAt", "desc"),
      limit(5),
    );
    return onSnapshot(
      jobsQuery,
      (snapshot) => {
        onData(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as CatalogReprocessJobDocument),
          })),
        );
      },
      (error) => onError(error.message),
    );
  },
};
