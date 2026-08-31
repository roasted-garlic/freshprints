import { HttpsError, onCall } from "firebase-functions/v2/https";

import type {
  SetPrintRequestItemArtworkEnhanceModeRequest,
  SetPrintRequestItemArtworkEnhanceModeResponse,
} from "../../packages/shared/src/types/printRequest/setPrintRequestItemArtworkEnhanceMode.types";

import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import {
  executeSetPrintRequestItemArtworkEnhanceMode,
  isStaffOnlyAuthError,
  parseSetPrintRequestItemArtworkEnhanceModeRequest,
} from "./lib/setPrintRequestItemArtworkEnhanceModeCore";
import { invalidArgument, unauthenticated } from "./lib/errors";
import { requirePortalCustomer } from "./lib/portalCustomer";

export const setPrintRequestItemArtworkEnhanceMode = onCall(
  { timeoutSeconds: 300, memory: "1GiB" },
  async (request): Promise<SetPrintRequestItemArtworkEnhanceModeResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    let parsed: SetPrintRequestItemArtworkEnhanceModeRequest;
    try {
      parsed = parseSetPrintRequestItemArtworkEnhanceModeRequest(request.data);
    } catch (error) {
      throw invalidArgument(error instanceof Error ? error.message : "Invalid request.");
    }

    const callerUid = request.auth.uid;

    try {
      const caller = await loadCallerProfile(callerUid);
      assertStaffCaller(caller);
      return executeSetPrintRequestItemArtworkEnhanceMode(
        { kind: "staff", callerId: callerUid },
        parsed,
      );
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      if (!isStaffOnlyAuthError(error)) {
        throw error;
      }
    }

    const portalCustomer = await requirePortalCustomer(callerUid);
    return executeSetPrintRequestItemArtworkEnhanceMode(
      {
        kind: "portal",
        callerId: callerUid,
        customerId: portalCustomer.customerId,
      },
      parsed,
    );
  },
);
