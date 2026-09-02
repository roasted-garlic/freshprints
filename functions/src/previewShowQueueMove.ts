import { HttpsError, onCall } from "firebase-functions/v2/https";

import type {
  ApplyShowQueueMoveResponse,
  PreviewShowQueueMoveResponse,
} from "../../packages/shared/src/types/showQueueMove/showQueueMove.types";

import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import {
  failedPrecondition,
  invalidArgument,
  unauthenticated,
} from "./lib/errors";
import {
  applyShowQueueMove as executeShowQueueMove,
  buildShowQueueMovePreview,
  parseShowQueueMoveApplyRequest,
  parseShowQueueMovePreviewRequest,
} from "./lib/showQueueMove";

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw failedPrecondition("Unable to process show queue move right now.");
}

export const previewShowQueueMove = onCall(
  async (request): Promise<PreviewShowQueueMoveResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertStaffCaller(caller);
      const parsed = parseShowQueueMovePreviewRequest(request.data);
      return await buildShowQueueMovePreview(parsed);
    } catch (error) {
      mapHttpsError(error);
    }
  },
);

export const applyShowQueueMove = onCall(
  async (request): Promise<ApplyShowQueueMoveResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertStaffCaller(caller);
      const parsed = parseShowQueueMoveApplyRequest(request.data);
      return await executeShowQueueMove({
        request: parsed,
        actorId: request.auth.uid,
      });
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
