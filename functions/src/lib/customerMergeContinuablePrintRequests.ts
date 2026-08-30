import { adminDb } from "./admin";
import { isPortalEditablePrintRequest } from "../../../packages/shared/src/utils/portalPrintRequestEditability";
import type {
  MergeContinuablePolicySummary,
  MergeContinuablePrintRequestSummary,
  MergeContinuableRequestClassification,
} from "../../../packages/shared/src/types/customer/customerAccountMerge.types";
import type { DeletionBlocker } from "../../../packages/shared/src/types/deletion/deletion.types";

export interface ContinuablePrintRequestWithItemCount {
  id: string;
  name: string;
  status: string;
  itemCount: number;
}

async function countPrintRequestItems(printRequestId: string): Promise<number> {
  const snapshot = await adminDb
    .collection("printRequestItems")
    .where("printRequestId", "==", printRequestId)
    .count()
    .get();
  return snapshot.data().count;
}

export async function loadContinuablePortalPrintRequestsWithItemCounts(
  customerId: string,
): Promise<ContinuablePrintRequestWithItemCount[]> {
  const snapshot = await adminDb
    .collection("printRequests")
    .where("customerId", "==", customerId)
    .where("status", "in", ["draft", "editing"])
    .limit(10)
    .get();

  const continuable = snapshot.docs.filter((doc) =>
    isPortalEditablePrintRequest({
      status: doc.data().status,
      requestOrigin: doc.data().requestOrigin,
      isInternal: doc.data().isInternal,
    }),
  );

  return Promise.all(
    continuable.map(async (doc) => {
      const data = doc.data();
      const itemCount = await countPrintRequestItems(doc.id);
      return {
        id: doc.id,
        name: typeof data.name === "string" ? data.name : doc.id,
        status: typeof data.status === "string" ? data.status : "draft",
        itemCount,
      };
    }),
  );
}

function classifyContinuableRequests(
  requests: ContinuablePrintRequestWithItemCount[],
): {
  classification: MergeContinuableRequestClassification;
  summaries: MergeContinuablePrintRequestSummary[];
} {
  if (requests.length === 0) {
    return { classification: "none", summaries: [] };
  }

  const summaries: MergeContinuablePrintRequestSummary[] = requests.map((request) => ({
    id: request.id,
    name: request.name,
    status: request.status,
    itemCount: request.itemCount,
    classification: request.itemCount === 0 ? "empty" : "meaningful",
  }));

  const hasMeaningful = summaries.some((request) => request.classification === "meaningful");
  return {
    classification: hasMeaningful ? "meaningful" : "empty",
    summaries,
  };
}

export function evaluateMergeContinuablePolicy(input: {
  source: ContinuablePrintRequestWithItemCount[];
  survivor: ContinuablePrintRequestWithItemCount[];
}): MergeContinuablePolicySummary {
  const sourceEval = classifyContinuableRequests(input.source);
  const survivorEval = classifyContinuableRequests(input.survivor);

  const blockers: DeletionBlocker[] = [];
  const emptyPrintRequestIdsToRemove: string[] = [];
  const sourceMeaningfulPrintRequestIdsToReassign: string[] = [];

  for (const request of sourceEval.summaries) {
    if (request.classification === "empty") {
      emptyPrintRequestIdsToRemove.push(request.id);
    }
  }

  for (const request of survivorEval.summaries) {
    if (request.classification === "empty") {
      emptyPrintRequestIdsToRemove.push(request.id);
    }
  }

  if (
    sourceEval.classification === "meaningful" &&
    survivorEval.classification === "meaningful"
  ) {
    blockers.push({
      code: "dual_meaningful_continuable_print_requests",
      message:
        "Both customers have continuable Portal print requests with items. Resolve one through Print Requests before merging accounts.",
    });
  }

  if (
    sourceEval.classification === "meaningful" &&
    (survivorEval.classification === "none" || survivorEval.classification === "empty")
  ) {
    for (const request of sourceEval.summaries) {
      if (request.classification === "meaningful") {
        sourceMeaningfulPrintRequestIdsToReassign.push(request.id);
      }
    }
  }

  return {
    sourceClassification: sourceEval.classification,
    survivorClassification: survivorEval.classification,
    sourceContinuableRequests: sourceEval.summaries,
    survivorContinuableRequests: survivorEval.summaries,
    blocked: blockers.length > 0,
    blockers,
    emptyPrintRequestIdsToRemove,
    sourceMeaningfulPrintRequestIdsToReassign,
  };
}

export type {
  MergeContinuablePrintRequestSummary,
  MergeContinuableRequestClassification,
};
