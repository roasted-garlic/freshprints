import { adminDb } from "./admin";
import { isPortalEditablePrintRequest } from "../../../packages/shared/src/utils/portalPrintRequestEditability";
import type { ContinuablePrintRequestSummary } from "../../../packages/shared/src/types/customer/customerDuplicateResolution.types";

export async function loadContinuablePortalPrintRequests(
  customerId: string,
): Promise<ContinuablePrintRequestSummary[]> {
  const snapshot = await adminDb
    .collection("printRequests")
    .where("customerId", "==", customerId)
    .where("status", "in", ["draft", "editing"])
    .limit(10)
    .get();

  return snapshot.docs
    .filter((doc) =>
      isPortalEditablePrintRequest({
        status: doc.data().status,
        requestOrigin: doc.data().requestOrigin,
        isInternal: doc.data().isInternal,
      }),
    )
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: typeof data.name === "string" ? data.name : doc.id,
        status: typeof data.status === "string" ? data.status : "draft",
      };
    });
}

export function evaluateContinuablePrintRequestBlockers(input: {
  sourceContinuable: ContinuablePrintRequestSummary[];
  survivorContinuable: ContinuablePrintRequestSummary[];
}): { blocked: boolean; blockers: Array<{ code: string; message: string }> } {
  const blockers: Array<{ code: string; message: string }> = [];

  if (input.sourceContinuable.length > 0 && input.survivorContinuable.length > 0) {
    blockers.push({
      code: "dual_continuable_print_requests",
      message:
        "Both customers have continuable Portal print requests. Resolve one through Print Requests before duplicate resolution.",
    });
  }

  if (input.sourceContinuable.length > 0) {
    blockers.push({
      code: "source_continuable_print_request",
      message:
        "The source account has a continuable Portal print request. Finish or resolve it before transfer and disable.",
    });
  }

  return {
    blocked: blockers.length > 0,
    blockers,
  };
}
