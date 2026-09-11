import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import { CUSTOMER_NOTIFICATIONS_COLLECTION } from "../../packages/shared/src/types/customerNotifications/customerNotifications.types";
import type {
  RespondToCustomerUploadCatalogPermissionFollowUpRequest,
  RespondToCustomerUploadCatalogPermissionFollowUpResponse,
} from "../../packages/shared/src/types/customerUpload/customerUploadCatalogPermission.types";
import { buildCustomerUploadCatalogPermissionFollowUpNotificationId } from "../../packages/shared/src/utils/customerNotifications";
import {
  buildCustomerUploadPermissionActivityId,
  normalizeCustomerUploadPermissionActivity,
  resolveCustomerUploadPermissionAskCount,
} from "../../packages/shared/src/utils/customerUploadPermissionFollowUp";

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

async function markPermissionFollowUpNotificationRead(requestToken: string): Promise<void> {
  const notificationId = buildCustomerUploadCatalogPermissionFollowUpNotificationId(requestToken);
  const ref = adminDb.collection(CUSTOMER_NOTIFICATIONS_COLLECTION).doc(notificationId);
  try {
    await ref.update({
      readAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // Missing/already-cleared alerts must not fail the customer decision write.
    console.warn("[respondToCustomerUploadCatalogPermissionFollowUp] mark notification read skipped", {
      notificationId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
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
      const attempt = (Math.max(
        1,
        resolveCustomerUploadPermissionAskCount({
          catalogPermissionAskCount: upload.catalogPermissionAskCount,
          catalogPermissionFollowUpStatus: "requested",
        }),
      ) === 2
        ? 2
        : 1) as 1 | 2;
      const activity = normalizeCustomerUploadPermissionActivity(upload.catalogPermissionActivity);
      const responseKind = approved ? "customer_allow" : "customer_decline";
      const responseId = buildCustomerUploadPermissionActivityId(responseKind, attempt);
      if (!activity.some((entry) => entry.id === responseId)) {
        activity.push({
          id: responseId,
          kind: responseKind,
          attempt,
          // Concrete Timestamp only — FieldValue.serverTimestamp() is illegal inside arrays.
          at: Timestamp.now(),
          byUid: request.auth!.uid,
        });
      }

      transaction.update(uploadRef, {
        catalogPermissionFollowUpStatus: approved ? "approved" : "declined",
        catalogPermissionFollowUpRespondedAt: FieldValue.serverTimestamp(),
        catalogPermissionFollowUpRespondedBy: request.auth!.uid,
        catalogReviewStatus: approved ? "pending_staff_review" : "excluded_from_catalog",
        catalogPermissionActivity: activity,
        // Re-entering Pending after Ask Again must sort to the top of Studio intake
        // (not stay at the original createdAt position in the batch).
        ...(approved ? { catalogPendingQueuedAt: FieldValue.serverTimestamp() } : {}),
        catalogRetentionStartedAt: approved
          ? FieldValue.delete()
          : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        decision: payload.decision,
        catalogReviewStatus: approved ? "pending_staff_review" : "excluded_from_catalog",
        followUpStatus: approved ? "approved" : "declined",
      };
      },
    );

    // Clear sticky Alerts row after Allow/Decline (idempotent path included).
    await markPermissionFollowUpNotificationRead(payload.requestToken);

    return result;
  },
);
