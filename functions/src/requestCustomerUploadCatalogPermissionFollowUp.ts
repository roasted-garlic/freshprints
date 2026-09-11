import { randomBytes } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import type {
  RequestCustomerUploadCatalogPermissionFollowUpRequest,
  RequestCustomerUploadCatalogPermissionFollowUpResponse,
} from "../../packages/shared/src/types/customerUpload/customerUploadCatalogPermission.types";
import {
  CUSTOMER_NOTIFICATION_CUSTOMER_UPLOAD_PERMISSION_BODY,
  buildCustomerNotificationTitle,
  buildCustomerUploadCatalogPermissionFollowUpNotificationId,
} from "../../packages/shared/src/utils/customerNotifications";
import {
  buildCustomerUploadPermissionActivityId,
  canRequestCustomerUploadPermissionFollowUp,
  normalizeCustomerUploadPermissionActivity,
  resolveCustomerUploadPermissionAskCount,
} from "../../packages/shared/src/utils/customerUploadPermissionFollowUp";

import { adminDb } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import {
  assertCanManageCustomerUploadIntake,
  parseUploadId,
} from "./lib/customerUploadStaffAuth";
import { createCustomerNotification } from "./lib/customerNotifications/createCustomerNotification";
import { failedPrecondition, invalidArgument, unauthenticated } from "./lib/errors";

const FOLLOW_UP_TOKEN_BYTES = 24;

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
          notificationId: buildCustomerUploadCatalogPermissionFollowUpNotificationId(existingToken),
          alreadyRequested: true,
        };
      }

      if (upload.purpose === "catalog_donation") {
        throw failedPrecondition("Catalog donations do not support permission follow-up.");
      }
      if (upload.catalogUseAcknowledged !== false) {
        throw failedPrecondition("A customer permission denial is required.");
      }

      if (
        !canRequestCustomerUploadPermissionFollowUp({
          catalogReviewStatus: upload.catalogReviewStatus,
          catalogExclusionReason: upload.catalogExclusionReason,
          catalogPermissionFollowUpStatus: existingStatus,
          catalogPermissionAskCount: upload.catalogPermissionAskCount,
        })
      ) {
        if (existingStatus === "approved") {
          throw failedPrecondition("This upload has already been approved for catalog review.");
        }
        if (resolveCustomerUploadPermissionAskCount({
          catalogPermissionAskCount: upload.catalogPermissionAskCount,
          catalogPermissionFollowUpStatus: existingStatus,
        }) >= 2) {
          throw failedPrecondition("Both permission follow-up requests have already been used.");
        }
        throw failedPrecondition("This upload is not eligible for another permission follow-up.");
      }

      const customerUid = typeof upload.customerUid === "string" ? upload.customerUid.trim() : "";
      const customerId = typeof upload.customerId === "string" ? upload.customerId.trim() : "";
      const printRequestId =
        typeof upload.printRequestId === "string" ? upload.printRequestId.trim() : "";
      if (!customerUid || !customerId || !printRequestId) {
        throw failedPrecondition("A linked authenticated customer Print Request is required.");
      }

      const priorAskCount = resolveCustomerUploadPermissionAskCount({
        catalogPermissionAskCount: upload.catalogPermissionAskCount,
        catalogPermissionFollowUpStatus: existingStatus === "declined" ? "declined" : "not_requested",
      });
      // When starting from not_requested, askCount is 0; after a decline, resolved count is prior asks.
      const nextAttempt = (priorAskCount + 1) as 1 | 2;
      const requestToken = newFollowUpToken();
      const activity = normalizeCustomerUploadPermissionActivity(upload.catalogPermissionActivity);
      const activityNow = Timestamp.now();
      if (!activity.some((entry) => entry.kind === "initial_denial")) {
        activity.push({
          id: buildCustomerUploadPermissionActivityId("initial_denial"),
          kind: "initial_denial",
          // Concrete Timestamp only — FieldValue.serverTimestamp() is illegal inside arrays.
          at: upload.catalogPermissionOriginalDeniedAt ?? activityNow,
          byUid: null,
        });
      }
      activity.push({
        id: buildCustomerUploadPermissionActivityId("ask_sent", nextAttempt),
        kind: "ask_sent",
        attempt: nextAttempt,
        at: activityNow,
        byUid: caller.id,
      });

      transaction.update(uploadRef, {
        catalogPermissionFollowUpStatus: "requested",
        catalogPermissionFollowUpRequestToken: requestToken,
        catalogPermissionFollowUpRequestedAt: FieldValue.serverTimestamp(),
        catalogPermissionFollowUpRequestedBy: caller.id,
        catalogPermissionAskCount: nextAttempt,
        catalogPermissionActivity: activity,
        // Pause retention while an ask is outstanding.
        catalogRetentionStartedAt: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        customerId,
        customerUid,
        printRequestId,
        requestToken,
        notificationId: buildCustomerUploadCatalogPermissionFollowUpNotificationId(requestToken),
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
