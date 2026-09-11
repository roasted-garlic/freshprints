import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import type {
  RespondToCustomerUploadCatalogPermissionFollowUpRequest,
  RespondToCustomerUploadCatalogPermissionFollowUpResponse,
} from "../../packages/shared/src/types/customerUpload/customerUploadCatalogPermission.types";

import { adminDb } from "./lib/admin";
import { failedPrecondition, invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import { assertPortalMaintenanceAllowsCustomerMutation } from "./lib/portalMaintenance";
import { requirePortalCustomer } from "./lib/portalCustomer";

function parseRequest(data: unknown): RespondToCustomerUploadCatalogPermissionFollowUpRequest {
  if (!data || typeof data !== "object") {
    throw new Error("Permission request is required.");
  }
  const record = data as Record<string, unknown>;
  const requestToken = record.requestToken;
  const decision = record.decision;
  if (
    typeof requestToken !== "string" ||
    requestToken.trim().length < 20 ||
    requestToken.trim().length > 128
  ) {
    throw new Error("Permission request token is invalid.");
  }
  if (decision !== "allow" && decision !== "decline") {
    throw new Error("Permission decision must be allow or decline.");
  }
  return { requestToken: requestToken.trim(), decision };
}

export const respondToCustomerUploadCatalogPermissionFollowUp = onCall(
  async (request): Promise<RespondToCustomerUploadCatalogPermissionFollowUpResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const portalCustomer = await requirePortalCustomer(request.auth.uid);
    await assertPortalMaintenanceAllowsCustomerMutation(request.auth.uid);

    let payload: RespondToCustomerUploadCatalogPermissionFollowUpRequest;
    try {
      payload = parseRequest(request.data);
    } catch (error) {
      throw invalidArgument(error instanceof Error ? error.message : "Invalid request.");
    }

    const tokenSnapshot = await adminDb
      .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads)
      .where("catalogPermissionFollowUpRequestToken", "==", payload.requestToken)
      .limit(1)
      .get();
    if (tokenSnapshot.empty) {
      throw permissionDenied("This permission request is no longer available.");
    }

    const uploadRef = tokenSnapshot.docs[0]!.ref;
    const result: RespondToCustomerUploadCatalogPermissionFollowUpResponse = await adminDb.runTransaction(
      async (transaction): Promise<RespondToCustomerUploadCatalogPermissionFollowUpResponse> => {
      const uploadSnap = await transaction.get(uploadRef);
      if (!uploadSnap.exists) {
        throw permissionDenied("This permission request is no longer available.");
      }
      const upload = uploadSnap.data() ?? {};
      if (upload.customerUid !== request.auth!.uid || upload.customerId !== portalCustomer.customerId) {
        throw permissionDenied("You can only respond to your own permission requests.");
      }

      const currentStatus = upload.catalogPermissionFollowUpStatus;
      if (currentStatus === "approved" || currentStatus === "declined") {
        const alreadyDecision = currentStatus === "approved" ? "allow" : "decline";
        if (alreadyDecision !== payload.decision) {
          throw failedPrecondition("This permission request has already been answered.");
        }
        return {
          decision: payload.decision,
          catalogReviewStatus:
            currentStatus === "approved" ? "pending_staff_review" : "excluded_from_catalog",
          followUpStatus: currentStatus,
        };
      }

      if (currentStatus !== "requested") {
        throw failedPrecondition("This permission request is no longer open.");
      }
      if (
        upload.catalogUseAcknowledged !== false ||
        upload.catalogReviewStatus !== "excluded_from_catalog" ||
        upload.catalogExclusionReason !== "customer_permission_denied" ||
        typeof upload.printRequestId !== "string" ||
        !upload.printRequestId.trim()
      ) {
        throw failedPrecondition("This upload is no longer eligible for permission follow-up.");
      }
      if (typeof upload.promotedDesignId === "string" && upload.promotedDesignId.trim()) {
        throw failedPrecondition("This upload is no longer eligible for permission follow-up.");
      }

      const approved = payload.decision === "allow";
      transaction.update(uploadRef, {
        catalogPermissionFollowUpStatus: approved ? "approved" : "declined",
        catalogPermissionFollowUpRespondedAt: FieldValue.serverTimestamp(),
        catalogPermissionFollowUpRespondedBy: request.auth!.uid,
        catalogReviewStatus: approved ? "pending_staff_review" : "excluded_from_catalog",
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        decision: payload.decision,
        catalogReviewStatus: approved ? "pending_staff_review" : "excluded_from_catalog",
        followUpStatus: approved ? "approved" : "declined",
      };
      },
    );

    return result;
  },
);
