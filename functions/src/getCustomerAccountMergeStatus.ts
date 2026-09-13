import { HttpsError, onCall } from "firebase-functions/v2/https";

import type {
  GetCustomerAccountMergeStatusRequest,
  GetCustomerAccountMergeStatusResponse,
} from "../../packages/shared/src/types/customer/customerAccountMerge.types";
import { loadCallerProfile } from "./lib/caller";
import { getCustomerMergeJob } from "./lib/customerAccountMergeJob";
import {
  internal,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";

function assertOwnerCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only owners can view customer account merge status.");
  }
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw internal(error.message.trim() || "Unable to load merge job status.");
  }
  throw internal("Unable to load merge job status.");
}

function parseStatusRequest(data: unknown): GetCustomerAccountMergeStatusRequest {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }

  const jobId = "jobId" in data && typeof data.jobId === "string" ? data.jobId.trim() : "";
  if (!jobId) {
    throw invalidArgument("Merge job id is required.");
  }

  return { jobId };
}

export const getCustomerAccountMergeStatus = onCall(
  async (request): Promise<GetCustomerAccountMergeStatusResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerCaller(caller);

      const payload = parseStatusRequest(request.data);
      const job = await getCustomerMergeJob(payload.jobId);

      if (!job) {
        throw invalidArgument("Merge job not found.");
      }

      return {
        job,
        canRetry: job.status === "failed" || job.status === "in_progress",
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
