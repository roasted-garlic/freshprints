import { HttpsError, onCall } from "firebase-functions/v2/https";

import type {
  CopyStudioPrintRequestRequest,
  CopyStudioPrintRequestResponse,
} from "../../packages/shared/src/types/printRequest/copyStudioPrintRequest.types";

import { adminDb } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import { internal, unauthenticated } from "./lib/errors";
import { copyStudioPrintRequestInTransaction } from "./lib/copyStudioPrintRequestCore";

function mapError(error: unknown): never {
  if (error instanceof HttpsError) throw error;
  if (error instanceof Error) throw internal(error.message);
  throw internal("Unable to copy this print request right now.");
}

export const copyStudioPrintRequest = onCall(
  async (request): Promise<CopyStudioPrintRequestResponse> => {
    if (!request.auth?.uid) throw unauthenticated();

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertStaffCaller(caller);
      const data = request.data as Partial<CopyStudioPrintRequestRequest> | undefined;
      const input: CopyStudioPrintRequestRequest = {
        sourcePrintRequestId: typeof data?.sourcePrintRequestId === "string" ? data.sourcePrintRequestId : "",
        destinationKind: data?.destinationKind as CopyStudioPrintRequestRequest["destinationKind"],
        destinationCustomerId:
          typeof data?.destinationCustomerId === "string" ? data.destinationCustomerId : undefined,
        destinationInternalBaseName:
          typeof data?.destinationInternalBaseName === "string" ? data.destinationInternalBaseName : undefined,
      };

      return await adminDb.runTransaction((transaction) =>
        copyStudioPrintRequestInTransaction(transaction, caller.id, input),
      );
    } catch (error) {
      mapError(error);
    }
  },
);
