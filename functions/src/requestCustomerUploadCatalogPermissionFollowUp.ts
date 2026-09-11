import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import type {
  RequestCustomerUploadCatalogPermissionFollowUpRequest,
  RequestCustomerUploadCatalogPermissionFollowUpResponse,
} from "../../packages/shared/src/types/customerUpload/customerUploadCatalogPermission.types";
import {
  CUSTOMER_NOTIFICATION_CUSTOMER_UPLOAD_PERMISSION_BODY,
  buildCustomerNotificationTitle,
} from "../../packages/shared/src/utils/customerNotifications";

import { adminDb } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import {
  assertCanManageCustomerUploadIntake,
  parseUploadId,
} from "./lib/customerUploadStaffAuth";
import { createCustomerNotification } from "./lib/customerNotifications/createCustomerNotification";
import { failedPrecondition, invalidArgument, unauthenticated } from "./lib/errors";

const FOLLOW_UP_TOKEN_BYTES = 24;
const NOTIFICATION_PREFIX = "customer_upload_permission_";

function newFollowUpToken(): string {
  return randomBytes(FOLLOW_UP_TOKEN_BYTES).toString("base64url");
}

function parseRequest(data: unknown): RequestCustomerUploadCatalogPermissionFollowUpRequest {
  return { uploadId: parseUploadId(data) };
}

export const requestCustomerUploadCatalogPermissionFollowUp = onCall(
  async (request): Promise<RequestCustomerUploadCatalogPermissionFollowUpResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertStaffCaller(caller);
    assertCanManageCustomerUploadIntake(caller);

    let payload: RequestCustomerUploadCatalogPermissionFollowUpRequest;
    try {
      payload = parseRequest(request.data);
    } catch (error) {
      throw invalidArgument(error instanceof Error ? error.message : "Invalid request.");
    }

    const uploadRef = adminDb.collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads).doc(payload.uploadId);
    const result = await adminDb.runTransaction(async (transaction) => {
      const uploadSnap = await transaction.get(uploadRef);
      if (!uploadSnap.exists) {
        throw invalidArgument("Upload was not found.");
      }

      const upload = uploadSnap.data() ?? {};
      const existingStatus = upload.catalogPermissionFollowUpStatus;
      const existingToken =
        typeof upload.catalogPermissionFollowUpRequestToken === "string"
          ? upload.catalogPermissionFollowUpRequestToken.trim()
          : "";

      if (existingStatus === "requested" && existingToken) {
        return {
          customerId: String(upload.customerId ?? ""),
          customerUid: String(upload.customerUid ?? ""),
          printRequestId: String(upload.printRequestId ?? ""),
          requestToken: existingToken,
          notificationId: `${NOTIFICATION_PREFIX}${existingToken}`,
          alreadyRequested: true,
        };
      }

      if (existingStatus === "approved" || existingStatus === "declined") {
        throw failedPrecondition("This upload has already received its one follow-up decision.");
      }
      if (upload.purpose === "catalog_donation") {
        throw failedPrecondition("Catalog donations do not support permission follow-up.");
      }
      if (upload.catalogReviewStatus !== "excluded_from_catalog") {
        throw failedPrecondition("Only excluded uploads can request catalog permission follow-up.");
      }
      if (upload.catalogExclusionReason !== "customer_permission_denied") {
        throw failedPrecondition("This upload was not excluded for customer permission denial.");
      }
      if (upload.catalogUseAcknowledged !== false) {
        throw failedPrecondition("A customer permission denial is required.");
      }

      const customerUid = typeof upload.customerUid === "string" ? upload.customerUid.trim() : "";
      const customerId = typeof upload.customerId === "string" ? upload.customerId.trim() : "";
      const printRequestId =
        typeof upload.printRequestId === "string" ? upload.printRequestId.trim() : "";
      if (!customerUid || !customerId || !printRequestId) {
        throw failedPrecondition("A linked authenticated customer Print Request is required.");
      }

      const requestToken = newFollowUpToken();
      transaction.update(uploadRef, {
        catalogPermissionFollowUpStatus: "requested",
        catalogPermissionFollowUpRequestToken: requestToken,
        catalogPermissionFollowUpRequestedAt: FieldValue.serverTimestamp(),
        catalogPermissionFollowUpRequestedBy: caller.id,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        customerId,
        customerUid,
        printRequestId,
        requestToken,
        notificationId: `${NOTIFICATION_PREFIX}${requestToken}`,
        alreadyRequested: false,
      };
    });

    await createCustomerNotification({
      id: result.notificationId,
      customerId: result.customerId,
      customerUid: result.customerUid,
      kind: "customer_upload_catalog_permission_follow_up",
      title: buildCustomerNotificationTitle("customer_upload_catalog_permission_follow_up"),
      body: CUSTOMER_NOTIFICATION_CUSTOMER_UPLOAD_PERMISSION_BODY,
      requestId: result.printRequestId,
      actionToken: result.requestToken,
    });

    return {
      uploadId: payload.uploadId,
      status: "requested",
      requestToken: result.requestToken,
      notificationId: result.notificationId,
    };
  },
);
