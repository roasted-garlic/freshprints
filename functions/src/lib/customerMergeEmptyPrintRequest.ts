import { adminDb } from "./admin";
import { isPortalEditablePrintRequest } from "../../../packages/shared/src/utils/portalPrintRequestEditability";
import { failedPrecondition, invalidArgument } from "./errors";

export async function removeEmptyContinuablePrintRequestInternal(input: {
  printRequestId: string;
  expectedCustomerId: string;
  expectedItemCount: 0;
}): Promise<void> {
  const requestRef = adminDb.collection("printRequests").doc(input.printRequestId);
  const requestSnap = await requestRef.get();

  if (!requestSnap.exists) {
    throw invalidArgument("Print request not found.");
  }

  const data = requestSnap.data() ?? {};

  if (data.customerId !== input.expectedCustomerId) {
    throw failedPrecondition("Print request customer ownership changed since preview.");
  }

  if (
    !isPortalEditablePrintRequest({
      status: data.status,
      requestOrigin: data.requestOrigin,
      isInternal: data.isInternal,
    })
  ) {
    throw failedPrecondition("Print request is no longer a continuable Portal draft.");
  }

  const itemCountSnap = await adminDb
    .collection("printRequestItems")
    .where("printRequestId", "==", input.printRequestId)
    .count()
    .get();
  const itemCount = itemCountSnap.data().count;

  if (itemCount !== input.expectedItemCount) {
    throw failedPrecondition(
      "Print request item count changed since preview. Run preview again before merging.",
    );
  }

  const allocationSnap = await adminDb
    .collection("showAllocations")
    .where("printRequestId", "==", input.printRequestId)
    .limit(1)
    .get();

  if (!allocationSnap.empty) {
    throw failedPrecondition(
      "Empty continuable print request has show allocations and cannot be removed during merge.",
    );
  }

  await requestRef.delete();
}
