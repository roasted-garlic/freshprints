import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import {
  ASSISTED_CREATION_ALLOWED_PROOF_TYPES,
  ASSISTED_CREATION_COLLECTION,
  ASSISTED_CREATION_FIELD_LIMITS,
  ASSISTED_CREATION_MESSAGE_COOLDOWN_MS,
  ASSISTED_CREATION_MESSAGE_MAX_LENGTH,
  ASSISTED_CREATION_MAX_PROOF_BYTES,
  ASSISTED_CREATION_MESSAGING_CLOSED_MESSAGE,
  ASSISTED_CREATION_OPEN_STATUSES,
  ASSISTED_CREATION_SCHEMA_VERSION,
  canCustomerUpdateAssistedCreation,
  canSendAssistedCreationMessage,
  type AssistedCreationStatus,
} from "../../packages/shared/src/constants/assistedCreation/assistedCreation.constants";
import type {
  CancelAssistedCreationRequestRequest,
  CancelAssistedCreationRequestResponse,
  CustomerRespondToAssistedCreationProofRequest,
  CustomerRespondToAssistedCreationProofResponse,
  CustomerSendAssistedCreationMessageRequest,
  CustomerSendAssistedCreationMessageResponse,
  CustomerUpdateAssistedCreationRequestRequest,
  CustomerUpdateAssistedCreationRequestResponse,
  StaffAddAssistedCreationFinalSourceRequest,
  StaffAddAssistedCreationFinalSourceResponse,
  StaffAddAssistedCreationProofRequest,
  StaffAddAssistedCreationProofResponse,
  StaffSendAssistedCreationMessageRequest,
  StaffSendAssistedCreationMessageResponse,
  StaffSuggestAssistedCreationCatalogDesignRequest,
  StaffSuggestAssistedCreationCatalogDesignResponse,
  StaffUpdateAssistedCreationStatusRequest,
  StaffUpdateAssistedCreationStatusResponse,
  SubmitAssistedCreationRequestRequest,
  SubmitAssistedCreationRequestResponse,
} from "../../packages/shared/src/types/assistedCreation/assistedCreationActions.types";
import type {
  AssistedCreationFinalSource,
  AssistedCreationProof,
  AssistedCreationReferenceImage,
  AssistedCreationRevisionEntry,
  AssistedCreationSuggestedCatalogDesign,
} from "../../packages/shared/src/types/assistedCreation/assistedCreation.types";
import { buildAssistedCatalogShareArtworkBackgroundSnapshots } from "../../packages/shared/src/utils/assistedCreationCatalogShareArtworkBackground";
import { buildAssistedCreationFinalArtworkDownloadFileName } from "../../packages/shared/src/utils/assistedCreationProofFileName";
import { EMAIL_DELIVERY_JOBS_COLLECTION } from "../../packages/shared/src/constants/emailProviders.constants";
import { formatAssistedCreationRequestUpdatedNote } from "../../packages/shared/src/utils/assistedCreationHistory";
import {
  AssistedCreationTransitionError,
  assertAssistedCreationIsOpen,
  assertAssistedCreationTransition,
} from "../../packages/shared/src/utils/assistedCreationTransitions";
import {
  answersForFirestore,
  parseAssistedCreationAnswers,
  parseAssistedCreationApprovalNote,
  parseAssistedCreationApprovalRating,
  parseAssistedCreationReferenceImageInputs,
  parseAssistedCreationReferenceImageUpdateInputs,
} from "../../packages/shared/src/utils/assistedCreationValidation";

import { adminDb } from "./lib/admin";
import { purgeAssistedCreationProofsForTerminal } from "./lib/assistedCreationProofPurge";
import { promoteAssistedCreationReferenceImages } from "./lib/assistedCreationReferencePromote";
import { loadCallerProfile } from "./lib/caller";
import {
  failedPrecondition,
  internal,
  invalidArgument,
  notFound,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";
import { requirePortalCustomer } from "./lib/etsy/requirePortalCustomer";
import { loadEmailProviderSettings } from "./lib/email/emailSettings";
import {
  createCatalogShareEmailJobId,
  createProofEmailJobId,
} from "./lib/email/emailJobIdentity";
import { createCustomerNotification } from "./lib/customerNotifications/createCustomerNotification";
import {
  buildAssistedCatalogShareReadyNotificationId,
  buildAssistedProofReadyNotificationId,
  buildAssistedStaffMessageNotificationId,
  buildCustomerNotificationTitle,
  CUSTOMER_NOTIFICATION_CATALOG_SHARE_BODY,
  CUSTOMER_NOTIFICATION_PROOF_BODY,
} from "../../packages/shared/src/utils/customerNotifications";

function isCatalogShareFulfillment(data: Record<string, unknown>): boolean {
  return data.fulfillmentMode === "catalog_share";
}

function suggestedDesignId(data: Record<string, unknown>): string | null {
  const suggestion = data.suggestedCatalogDesign;
  if (!suggestion || typeof suggestion !== "object" || Array.isArray(suggestion)) {
    return null;
  }
  const designId = (suggestion as { designId?: unknown }).designId;
  return typeof designId === "string" && designId.trim() ? designId.trim() : null;
}

async function purgeProofsAfterTerminal(input: {
  requestId: string;
  terminalKind: "approved" | "rejected_or_cancelled";
  approvedProofId?: string | null;
}): Promise<void> {
  const docRef = adminDb.collection(ASSISTED_CREATION_COLLECTION).doc(input.requestId);
  const snap = await docRef.get();
  if (!snap.exists) {
    return;
  }
  const data = snap.data() ?? {};
  const proofs = Array.isArray(data.proofs) ? (data.proofs as AssistedCreationProof[]) : [];
  if (proofs.length === 0) {
    return;
  }
  try {
    await purgeAssistedCreationProofsForTerminal({
      docRef,
      proofs,
      terminalKind: input.terminalKind,
      approvedProofId:
        input.approvedProofId ??
        (typeof data.approvedProofId === "string" ? data.approvedProofId : null),
    });
  } catch (error) {
    console.error("[assistedCreationProofPurge] failed after terminal transition", {
      requestId: input.requestId,
      terminalKind: input.terminalKind,
      error,
    });
  }
}

function mapHttpsError(error: unknown, fallback: string): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof AssistedCreationTransitionError) {
    if (error.code === "forbidden_actor") {
      throw permissionDenied(error.message);
    }
    throw failedPrecondition(error.message);
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw internal(fallback);
}

function assertOwnerAdminCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied("Only owners and admins can update assisted creation requests.");
  }
}

function assertOwnerCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only the owner can restore a cancelled assisted creation request.");
  }
}

function asTrimmedOptional(value: unknown, max: number, label: string): string | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw invalidArgument(`${label} must be text.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw invalidArgument(`${label} must be ${max} characters or fewer.`);
  }
  return trimmed.length > 0 ? trimmed : undefined;
}

function asRequiredReason(value: unknown, label: string): string {
  const trimmed = asTrimmedOptional(value, ASSISTED_CREATION_FIELD_LIMITS.revisionNote, label);
  if (!trimmed) {
    throw invalidArgument(`${label} is required.`);
  }
  return trimmed;
}

function revisionAtMillis(value: unknown): number | null {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  if (value && typeof value === "object" && "toMillis" in value) {
    const toMillis = (value as { toMillis?: unknown }).toMillis;
    if (typeof toMillis === "function") {
      const millis = toMillis.call(value);
      return typeof millis === "number" && Number.isFinite(millis) ? millis : null;
    }
  }
  return null;
}

function staffActionLabel(action: StaffUpdateAssistedCreationStatusRequest["action"]): string {
  switch (action) {
    case "start_work":
      return "Started work";
    case "resume_work":
      return "Resumed work";
    case "reject":
      return "Rejected";
    case "cancel":
      return "Cancelled";
    case "restore":
      return "Restored cancelled request";
    case "update_notes":
      return "Updated staff notes";
    default:
      return action;
  }
}

/** Allows empty string so staff can clear internal notes. */
function asStaffNotesField(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value !== "string") {
    throw invalidArgument("Staff notes must be text.");
  }
  const trimmed = value.trim();
  if (trimmed.length > ASSISTED_CREATION_FIELD_LIMITS.staffNote) {
    throw invalidArgument(
      `Staff notes must be ${ASSISTED_CREATION_FIELD_LIMITS.staffNote} characters or fewer.`,
    );
  }
  return trimmed;
}

function appendRevision(
  history: AssistedCreationRevisionEntry[],
  entry: Omit<AssistedCreationRevisionEntry, "at"> & { at?: unknown },
): AssistedCreationRevisionEntry[] {
  // Firestore rejects FieldValue.serverTimestamp() inside arrays — use Timestamp.now().
  return [
    ...history,
    {
      ...entry,
      at: entry.at ?? Timestamp.now(),
    },
  ];
}

export const submitAssistedCreationRequest = onCall(
  async (request): Promise<SubmitAssistedCreationRequestResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const portalCustomer = await requirePortalCustomer(request.auth.uid);
      const data = (request.data ?? {}) as SubmitAssistedCreationRequestRequest;
      const answers = parseAssistedCreationAnswers(data.answers);
      const requireCloneUpload = answers.referenceUsage.includes("clone_with_subtle_changes");
      const referenceInputs = parseAssistedCreationReferenceImageInputs(data.referenceImages, {
        customerUid: portalCustomer.customerUid,
        requireCloneUpload,
      });
      if (!answers.hasReferences && referenceInputs.length > 0) {
        throw invalidArgument("Clear reference uploads when you have no references.");
      }
      if (
        answers.hasReferences &&
        !answers.referenceUsage.includes("will_share_later") &&
        referenceInputs.length === 0 &&
        requireCloneUpload
      ) {
        throw invalidArgument("Clone-with-subtle-changes requires at least one upload.");
      }

      const openQuery = await adminDb
        .collection(ASSISTED_CREATION_COLLECTION)
        .where("customerId", "==", portalCustomer.customerId)
        .where("status", "in", [...ASSISTED_CREATION_OPEN_STATUSES])
        .limit(1)
        .get();

      if (!openQuery.empty) {
        throw failedPrecondition(
          "You already have an open assisted creation request. Finish or cancel it before starting another.",
        );
      }

      const ref = adminDb.collection(ASSISTED_CREATION_COLLECTION).doc();
      const now = Timestamp.now();
      const referenceImages: AssistedCreationReferenceImage[] = referenceInputs.map((image) => ({
        ...image,
        uploadedAt: now,
      }));

      const revisionHistory: AssistedCreationRevisionEntry[] = [
        {
          at: now,
          byUid: portalCustomer.customerUid,
          byRole: "customer",
          note: "Request submitted",
          fromStatus: null,
          toStatus: "submitted",
        },
      ];

      await ref.set({
        id: ref.id,
        schemaVersion: ASSISTED_CREATION_SCHEMA_VERSION,
        customerId: portalCustomer.customerId,
        customerUid: portalCustomer.customerUid,
        status: "submitted" satisfies AssistedCreationStatus,
        answers: answersForFirestore(answers),
        referenceImages,
        proofs: [],
        revisionHistory,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Promote pending uploads into durable request-scoped Storage paths (DATA_MODEL).
      if (referenceImages.length > 0) {
        const promoted = await promoteAssistedCreationReferenceImages({
          customerUid: portalCustomer.customerUid,
          requestId: ref.id,
          images: referenceImages,
        });
        const changed = promoted.some(
          (image, index) => image.storagePath !== referenceImages[index]?.storagePath,
        );
        if (changed) {
          await ref.update({
            referenceImages: promoted,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      return { requestId: ref.id };
    } catch (error) {
      mapHttpsError(error, "Unable to submit your assisted creation request right now.");
    }
  },
);

export const cancelAssistedCreationRequest = onCall(
  async (request): Promise<CancelAssistedCreationRequestResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const portalCustomer = await requirePortalCustomer(request.auth.uid);
      const data = (request.data ?? {}) as CancelAssistedCreationRequestRequest;
      const requestId = typeof data.requestId === "string" ? data.requestId.trim() : "";
      if (!requestId) {
        throw invalidArgument("Request id is required.");
      }
      const cancelReason = asRequiredReason(data.reason, "Cancel reason");

      const docRef = adminDb.collection(ASSISTED_CREATION_COLLECTION).doc(requestId);
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists) {
          throw notFound("Assisted creation request not found.");
        }
        const current = snap.data()!;
        if (current.customerUid !== portalCustomer.customerUid) {
          throw permissionDenied("You can only cancel your own request.");
        }
        const fromStatus = current.status as AssistedCreationStatus;
        assertAssistedCreationIsOpen(fromStatus);
        assertAssistedCreationTransition({
          fromStatus,
          toStatus: "cancelled",
          actor: "customer",
        });
        const history = Array.isArray(current.revisionHistory) ? current.revisionHistory : [];
        tx.update(docRef, {
          status: "cancelled",
          customerCancelReason: cancelReason,
          revisionHistory: appendRevision(history, {
            byUid: portalCustomer.customerUid,
            byRole: "customer",
            kind: "status",
            note: `Cancelled by customer — ${cancelReason}`,
            fromStatus,
            toStatus: "cancelled",
          }),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      await purgeProofsAfterTerminal({
        requestId,
        terminalKind: "rejected_or_cancelled",
      });

      return { requestId, status: "cancelled" };
    } catch (error) {
      mapHttpsError(error, "Unable to cancel this request right now.");
    }
  },
);

export const customerUpdateAssistedCreationRequest = onCall(
  async (request): Promise<CustomerUpdateAssistedCreationRequestResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const portalCustomer = await requirePortalCustomer(request.auth.uid);
      const data = (request.data ?? {}) as CustomerUpdateAssistedCreationRequestRequest;
      const requestId = typeof data.requestId === "string" ? data.requestId.trim() : "";
      if (!requestId) {
        throw invalidArgument("Request id is required.");
      }

      const answers = parseAssistedCreationAnswers(data.answers);
      const requireCloneUpload = answers.referenceUsage.includes("clone_with_subtle_changes");
      const updateNote = asTrimmedOptional(
        data.updateNote,
        ASSISTED_CREATION_FIELD_LIMITS.revisionNote,
        "Update note",
      );

      const docRef = adminDb.collection(ASSISTED_CREATION_COLLECTION).doc(requestId);
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists) {
          throw notFound("Assisted creation request not found.");
        }
        const current = snap.data()!;
        if (current.customerUid !== portalCustomer.customerUid) {
          throw permissionDenied("You can only update your own request.");
        }

        const fromStatus = current.status as AssistedCreationStatus;
        if (!canCustomerUpdateAssistedCreation(fromStatus)) {
          throw failedPrecondition(
            "You can only update this request before staff marks it in progress.",
          );
        }

        const existingRaw = Array.isArray(current.referenceImages)
          ? (current.referenceImages as AssistedCreationReferenceImage[])
          : [];
        const existingImages = existingRaw.map((image) => ({
          id: String(image.id ?? ""),
          storagePath: String(image.storagePath ?? ""),
          fileName: String(image.fileName ?? ""),
          contentType: String(image.contentType ?? ""),
          sizeBytes:
            typeof image.sizeBytes === "number" && Number.isFinite(image.sizeBytes)
              ? Math.floor(image.sizeBytes)
              : 0,
        }));

        const referenceInputs = parseAssistedCreationReferenceImageUpdateInputs(
          data.referenceImages === undefined ? undefined : data.referenceImages,
          {
            customerUid: portalCustomer.customerUid,
            requireCloneUpload,
            existingImages,
          },
        );

        if (!answers.hasReferences && referenceInputs.length > 0) {
          throw invalidArgument("Clear reference uploads when you have no references.");
        }
        if (
          answers.hasReferences &&
          !answers.referenceUsage.includes("will_share_later") &&
          referenceInputs.length === 0 &&
          requireCloneUpload
        ) {
          throw invalidArgument("Clone-with-subtle-changes requires at least one upload.");
        }

        const now = Timestamp.now();
        const existingByKey = new Map<string, AssistedCreationReferenceImage>(
          existingRaw.map((image) => [`${image.id}::${image.storagePath}`, image]),
        );
        const referenceImages: AssistedCreationReferenceImage[] = referenceInputs.map((image) => {
          const prior = existingByKey.get(`${image.id}::${image.storagePath}`);
          return {
            ...image,
            uploadedAt: prior?.uploadedAt ?? now,
          };
        });

        const history = Array.isArray(current.revisionHistory) ? current.revisionHistory : [];
        const historyNote = formatAssistedCreationRequestUpdatedNote(updateNote);

        tx.update(docRef, {
          answers: answersForFirestore(answers),
          referenceImages,
          revisionHistory: appendRevision(history, {
            byUid: portalCustomer.customerUid,
            byRole: "customer",
            kind: "request_update",
            note: historyNote,
            fromStatus,
            toStatus: "submitted",
          }),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      // Promote any new pending uploads added on this edit (create path does the same).
      const snapAfter = await docRef.get();
      const rawAfter = Array.isArray(snapAfter.data()?.referenceImages)
        ? (snapAfter.data()!.referenceImages as AssistedCreationReferenceImage[])
        : [];
      if (rawAfter.length > 0) {
        const promoted = await promoteAssistedCreationReferenceImages({
          customerUid: portalCustomer.customerUid,
          requestId,
          images: rawAfter,
        });
        const changed = promoted.some(
          (image, index) => image.storagePath !== rawAfter[index]?.storagePath,
        );
        if (changed) {
          await docRef.update({
            referenceImages: promoted,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }

      return { requestId, status: "submitted" };
    } catch (error) {
      mapHttpsError(error, "Unable to update your assisted creation request right now.");
    }
  },
);

export const customerSendAssistedCreationMessage = onCall(
  async (request): Promise<CustomerSendAssistedCreationMessageResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const portalCustomer = await requirePortalCustomer(request.auth.uid);
      const data = (request.data ?? {}) as CustomerSendAssistedCreationMessageRequest;
      const requestId = typeof data.requestId === "string" ? data.requestId.trim() : "";
      if (!requestId) {
        throw invalidArgument("Request id is required.");
      }
      const message = asTrimmedOptional(
        data.message,
        ASSISTED_CREATION_MESSAGE_MAX_LENGTH,
        "Message",
      );
      if (!message) {
        throw invalidArgument("Message is required.");
      }

      const docRef = adminDb.collection(ASSISTED_CREATION_COLLECTION).doc(requestId);
      let currentStatus: AssistedCreationStatus = "submitted";
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists) {
          throw notFound("Assisted creation request not found.");
        }
        const current = snap.data()!;
        if (current.customerUid !== portalCustomer.customerUid) {
          throw permissionDenied("You can only message your own request.");
        }

        const status = current.status as AssistedCreationStatus;
        if (!canSendAssistedCreationMessage(status)) {
          throw failedPrecondition(ASSISTED_CREATION_MESSAGING_CLOSED_MESSAGE);
        }

        const history = Array.isArray(current.revisionHistory)
          ? (current.revisionHistory as AssistedCreationRevisionEntry[])
          : [];
        const now = Timestamp.now();
        const latestCustomerMessageAt = history.reduce<number | null>((latest, entry) => {
          if (entry.kind !== "customer_message" || entry.byRole !== "customer") {
            return latest;
          }
          const at = revisionAtMillis(entry.at);
          return at != null && (latest == null || at > latest) ? at : latest;
        }, null);
        if (
          latestCustomerMessageAt != null &&
          now.toMillis() - latestCustomerMessageAt < ASSISTED_CREATION_MESSAGE_COOLDOWN_MS
        ) {
          throw failedPrecondition("Wait a few seconds before sending another message.");
        }

        currentStatus = status;
        tx.update(docRef, {
          revisionHistory: appendRevision(history, {
            at: now,
            byUid: portalCustomer.customerUid,
            byRole: "customer",
            kind: "customer_message",
            note: message,
            fromStatus: status,
            toStatus: status,
          }),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      return { requestId, status: currentStatus };
    } catch (error) {
      mapHttpsError(error, "Unable to send your message right now.");
    }
  },
);

export const staffSendAssistedCreationMessage = onCall(
  async (request): Promise<StaffSendAssistedCreationMessageResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerAdminCaller(caller);

      const data = (request.data ?? {}) as StaffSendAssistedCreationMessageRequest;
      const requestId = typeof data.requestId === "string" ? data.requestId.trim() : "";
      if (!requestId) {
        throw invalidArgument("Request id is required.");
      }
      const message = asTrimmedOptional(
        data.message,
        ASSISTED_CREATION_MESSAGE_MAX_LENGTH,
        "Message",
      );
      if (!message) {
        throw invalidArgument("Message is required.");
      }

      const docRef = adminDb.collection(ASSISTED_CREATION_COLLECTION).doc(requestId);
      let currentStatus: AssistedCreationStatus = "submitted";
      let notifyCustomerId = "";
      let notifyCustomerUid = "";
      let notifyAtMillis = 0;
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists) {
          throw notFound("Assisted creation request not found.");
        }
        const current = snap.data()!;
        const status = current.status as AssistedCreationStatus;
        if (!canSendAssistedCreationMessage(status)) {
          throw failedPrecondition(ASSISTED_CREATION_MESSAGING_CLOSED_MESSAGE);
        }

        const customerId = String(current.customerId ?? "").trim();
        const customerUid = String(current.customerUid ?? "").trim();
        if (!customerId || !customerUid) {
          throw failedPrecondition("This request is missing its customer linkage.");
        }

        const history = Array.isArray(current.revisionHistory)
          ? (current.revisionHistory as AssistedCreationRevisionEntry[])
          : [];
        const now = Timestamp.now();
        const latestStaffMessageAt = history.reduce<number | null>((latest, entry) => {
          if (entry.kind !== "staff_message" || entry.byRole !== "staff") {
            return latest;
          }
          const at = revisionAtMillis(entry.at);
          return at != null && (latest == null || at > latest) ? at : latest;
        }, null);
        if (
          latestStaffMessageAt != null &&
          now.toMillis() - latestStaffMessageAt < ASSISTED_CREATION_MESSAGE_COOLDOWN_MS
        ) {
          throw failedPrecondition("Wait a few seconds before sending another message.");
        }

        currentStatus = status;
        notifyCustomerId = customerId;
        notifyCustomerUid = customerUid;
        notifyAtMillis = now.toMillis();
        tx.update(docRef, {
          revisionHistory: appendRevision(history, {
            at: now,
            byUid: caller.id,
            byRole: "staff",
            kind: "staff_message",
            note: message,
            fromStatus: status,
            toStatus: status,
          }),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      try {
        const notificationId = buildAssistedStaffMessageNotificationId(requestId, notifyAtMillis);
        await createCustomerNotification({
          id: notificationId,
          customerId: notifyCustomerId,
          customerUid: notifyCustomerUid,
          kind: "assisted_staff_message",
          title: buildCustomerNotificationTitle("assisted_staff_message"),
          body: message,
          requestId,
        });
        console.info("[staffSendAssistedCreationMessage] notification ok", {
          requestId,
          notificationId,
          customerUid: notifyCustomerUid,
        });
      } catch (notifyError) {
        console.error("[staffSendAssistedCreationMessage] notification failed", {
          requestId,
          customerUid: notifyCustomerUid,
          customerId: notifyCustomerId,
          error: notifyError,
        });
      }

      return { requestId, status: currentStatus };
    } catch (error) {
      mapHttpsError(error, "Unable to send staff message right now.");
    }
  },
);

export const customerRespondToAssistedCreationProof = onCall(
  async (request): Promise<CustomerRespondToAssistedCreationProofResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const portalCustomer = await requirePortalCustomer(request.auth.uid);
      const data = (request.data ?? {}) as CustomerRespondToAssistedCreationProofRequest;
      const requestId = typeof data.requestId === "string" ? data.requestId.trim() : "";
      if (!requestId) {
        throw invalidArgument("Request id is required.");
      }
      if (data.decision !== "approve" && data.decision !== "request_revision") {
        throw invalidArgument("Choose approve or request revision.");
      }

      let rating: ReturnType<typeof parseAssistedCreationApprovalRating>;
      let approvalNote: string | undefined;
      let revisionNote: string | undefined;

      try {
        if (data.decision === "approve") {
          rating = parseAssistedCreationApprovalRating(data.rating);
          approvalNote = parseAssistedCreationApprovalNote(data.note);
        } else {
          revisionNote = asTrimmedOptional(
            data.note,
            ASSISTED_CREATION_FIELD_LIMITS.revisionNote,
            "Revision note",
          );
          if (!revisionNote) {
            throw invalidArgument("Add a revision note so staff know what to change.");
          }
          if (data.rating != null) {
            throw invalidArgument("Rating is only allowed when approving a proof.");
          }
        }
      } catch (error) {
        if (error instanceof HttpsError) {
          throw error;
        }
        throw invalidArgument(error instanceof Error ? error.message : "Invalid proof response.");
      }

      const docRef = adminDb.collection(ASSISTED_CREATION_COLLECTION).doc(requestId);
      let approvedProofId: string | null = null;
      let resultStatus: AssistedCreationStatus = "revision_requested";
      let shouldPurgeSiblingProofs = false;
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists) {
          throw notFound("Assisted creation request not found.");
        }
        const current = snap.data()!;
        if (current.customerUid !== portalCustomer.customerUid) {
          throw permissionDenied("You can only respond to your own proof.");
        }
        const fromStatus = current.status as AssistedCreationStatus;
        const catalogShare = isCatalogShareFulfillment(current as Record<string, unknown>);
        const serverDesignId = suggestedDesignId(current as Record<string, unknown>);
        // Proof-image approve → Final Source Needed; catalog_share stays terminal approved (ADR-FP-108).
        const toStatus: AssistedCreationStatus =
          data.decision === "approve"
            ? catalogShare
              ? "approved"
              : "final_source_needed"
            : "revision_requested";
        resultStatus = toStatus;
        shouldPurgeSiblingProofs = toStatus === "final_source_needed" && !catalogShare;
        assertAssistedCreationTransition({
          fromStatus,
          toStatus,
          actor: "customer",
          revisionNote,
        });
        const history = Array.isArray(current.revisionHistory) ? current.revisionHistory : [];
        const historyNote =
          data.decision === "approve"
            ? [
                catalogShare ? "Customer approved library design" : "Customer approved proof",
                rating != null ? `(rated ${rating}/5)` : null,
                approvalNote ? `— ${approvalNote}` : null,
              ]
                .filter(Boolean)
                .join(" ")
            : (revisionNote ?? "");
        const update: Record<string, unknown> = {
          status: toStatus,
          revisionHistory: appendRevision(history, {
            byUid: portalCustomer.customerUid,
            byRole: "customer",
            note: historyNote,
            fromStatus,
            toStatus,
          }),
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (data.decision === "approve") {
          if (catalogShare) {
            if (!serverDesignId) {
              throw failedPrecondition("There is no library design suggestion to approve.");
            }
            const designSnap = await tx.get(adminDb.collection("designs").doc(serverDesignId));
            if (!designSnap.exists) {
              throw failedPrecondition(
                "That library design is no longer available. Ask staff for a new suggestion or a custom proof.",
              );
            }
            const designStatus = designSnap.data()?.status;
            if (designStatus !== "ready") {
              throw failedPrecondition(
                "That library design is no longer available. Ask staff for a new suggestion or a custom proof.",
              );
            }
            update.approvedCatalogDesignId = serverDesignId;
            update.approvedAt = FieldValue.serverTimestamp();
            if (rating != null) {
              update.customerRating = rating;
            }
            if (approvalNote) {
              update.customerApprovalNote = approvalNote;
            }
          } else {
            const proofs = Array.isArray(current.proofs)
              ? (current.proofs as AssistedCreationProof[])
              : [];
            const latestProof = proofs.length > 0 ? proofs[proofs.length - 1] : null;
            if (!latestProof?.id) {
              throw failedPrecondition("There is no proof to approve.");
            }
            approvedProofId = latestProof.id;
            update.approvedProofId = latestProof.id;
            update.approvedAt = FieldValue.serverTimestamp();
            if (rating != null) {
              update.customerRating = rating;
            }
            if (approvalNote) {
              update.customerApprovalNote = approvalNote;
            }
          }
        }
        tx.update(docRef, update);
      });

      // Sibling proof purge on proof-image approve (keeps approvedProofId); same as former terminal approve.
      if (shouldPurgeSiblingProofs) {
        await purgeProofsAfterTerminal({
          requestId,
          terminalKind: "approved",
          approvedProofId,
        });
      }

      return { requestId, status: resultStatus };
    } catch (error) {
      mapHttpsError(error, "Unable to save your proof response right now.");
    }
  },
);

export const staffUpdateAssistedCreationStatus = onCall(
  async (request): Promise<StaffUpdateAssistedCreationStatusResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      const data = (request.data ?? {}) as StaffUpdateAssistedCreationStatusRequest;
      const requestId = typeof data.requestId === "string" ? data.requestId.trim() : "";
      if (!requestId) {
        throw invalidArgument("Request id is required.");
      }

      const docRef = adminDb.collection(ASSISTED_CREATION_COLLECTION).doc(requestId);

      if (data.action === "update_notes") {
        assertOwnerAdminCaller(caller);
        const staffNotesValue = asStaffNotesField(data.staffNotes);
        let notesStatus: AssistedCreationStatus = "submitted";
        await adminDb.runTransaction(async (tx) => {
          const snap = await tx.get(docRef);
          if (!snap.exists) {
            throw notFound("Assisted creation request not found.");
          }
          const current = snap.data()!;
          notesStatus = current.status as AssistedCreationStatus;
          tx.update(docRef, {
            staffNotes: staffNotesValue,
            updatedAt: FieldValue.serverTimestamp(),
          });
        });
        return { requestId, status: notesStatus };
      }

      const actionToStatus: Record<
        Exclude<StaffUpdateAssistedCreationStatusRequest["action"], "update_notes">,
        AssistedCreationStatus
      > = {
        start_work: "in_progress",
        resume_work: "in_progress",
        reject: "rejected",
        cancel: "cancelled",
        restore: "submitted",
      };
      if (!(data.action in actionToStatus)) {
        throw invalidArgument("Unsupported staff action.");
      }

      if (data.action === "restore") {
        assertOwnerCaller(caller);
      } else {
        assertOwnerAdminCaller(caller);
      }

      const toStatus = actionToStatus[data.action];
      const staffNotes = asTrimmedOptional(
        data.staffNotes,
        ASSISTED_CREATION_FIELD_LIMITS.staffNote,
        "Staff notes",
      );
      const reasonRequired =
        data.action === "reject" || data.action === "cancel" || data.action === "restore";
      const reason = reasonRequired
        ? asRequiredReason(
            data.reason,
            data.action === "restore"
              ? "Restore reason"
              : data.action === "reject"
                ? "Rejection reason"
                : "Cancellation reason",
          )
        : asTrimmedOptional(data.reason, ASSISTED_CREATION_FIELD_LIMITS.revisionNote, "Reason");

      let nextStatus: AssistedCreationStatus = toStatus;

      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists) {
          throw notFound("Assisted creation request not found.");
        }
        const current = snap.data()!;
        const fromStatus = current.status as AssistedCreationStatus;
        // Fail closed: reject is New/submitted only — after Start Work use cancel.
        if (data.action === "reject" && fromStatus !== "submitted") {
          throw failedPrecondition(
            "Only submitted (New) requests can be rejected. Cancel the request instead.",
          );
        }
        assertAssistedCreationTransition({
          fromStatus,
          toStatus,
          actor: "staff",
          revisionNote: reason,
        });

        if (data.action === "restore") {
          const customerUid =
            typeof current.customerUid === "string" ? current.customerUid.trim() : "";
          if (!customerUid) {
            throw failedPrecondition("This request is missing a customer uid.");
          }
          const openSnap = await tx.get(
            adminDb
              .collection(ASSISTED_CREATION_COLLECTION)
              .where("customerUid", "==", customerUid)
              .where("status", "in", [...ASSISTED_CREATION_OPEN_STATUSES]),
          );
          const otherOpen = openSnap.docs.some((docSnap) => docSnap.id !== requestId);
          if (otherOpen) {
            throw failedPrecondition(
              "This customer already has another open assisted request. Finish or cancel it before restoring.",
            );
          }
        }

        nextStatus = toStatus;
        const history = Array.isArray(current.revisionHistory) ? current.revisionHistory : [];
        const patch: Record<string, unknown> = {
          status: toStatus,
          revisionHistory: appendRevision(history, {
            byUid: caller.id,
            byRole: "staff",
            note: reason ?? staffActionLabel(data.action),
            fromStatus,
            toStatus,
          }),
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (staffNotes !== undefined) {
          patch.staffNotes = staffNotes;
        }
        // Resume after revision: clear stale catalog suggestion so in_progress has no ghost card.
        if (data.action === "resume_work") {
          patch.suggestedCatalogDesign = null;
          patch.fulfillmentMode = FieldValue.delete();
        }
        tx.update(docRef, patch);
      });

      if (data.action === "reject" || data.action === "cancel") {
        await purgeProofsAfterTerminal({
          requestId,
          terminalKind: "rejected_or_cancelled",
        });
      }

      return { requestId, status: nextStatus };
    } catch (error) {
      mapHttpsError(error, "Unable to update assisted creation status right now.");
    }
  },
);

export const staffAddAssistedCreationProof = onCall(
  async (request): Promise<StaffAddAssistedCreationProofResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerAdminCaller(caller);
      const data = (request.data ?? {}) as StaffAddAssistedCreationProofRequest;
      const requestId = typeof data.requestId === "string" ? data.requestId.trim() : "";
      if (!requestId) {
        throw invalidArgument("Request id is required.");
      }
      const proofIn = data.proof;
      if (!proofIn || typeof proofIn !== "object") {
        throw invalidArgument("Proof details are required.");
      }

      const proofId = typeof proofIn.id === "string" ? proofIn.id.trim() : "";
      const storagePath = typeof proofIn.storagePath === "string" ? proofIn.storagePath.trim() : "";
      const fileName = typeof proofIn.fileName === "string" ? proofIn.fileName.trim() : "";
      const contentType =
        typeof proofIn.contentType === "string" ? proofIn.contentType.trim() : "";
      const sizeBytes =
        typeof proofIn.sizeBytes === "number" && Number.isFinite(proofIn.sizeBytes)
          ? Math.floor(proofIn.sizeBytes)
          : -1;
      const note = asTrimmedOptional(
        proofIn.note,
        ASSISTED_CREATION_FIELD_LIMITS.staffNote,
        "Proof note",
      );

      if (!proofId || !storagePath || !fileName || !contentType || sizeBytes <= 0) {
        throw invalidArgument("Proof metadata is incomplete.");
      }
      if (!(ASSISTED_CREATION_ALLOWED_PROOF_TYPES as readonly string[]).includes(contentType)) {
        throw invalidArgument("Proof must be JPEG, PNG, or WebP.");
      }
      if (sizeBytes > ASSISTED_CREATION_MAX_PROOF_BYTES) {
        throw invalidArgument("Proof file is too large.");
      }

      const emailSettings = await loadEmailProviderSettings();
      console.info("[staffAddAssistedCreationProof] proof email provider snapshot", {
        requestId,
        proofNoticeProvider: emailSettings.proofNoticeProvider,
        inviteProvider: emailSettings.inviteProvider,
      });
      const docRef = adminDb.collection(ASSISTED_CREATION_COLLECTION).doc(requestId);
      const deliveryJobId = createProofEmailJobId(requestId, proofId);
      const deliveryJobRef = adminDb
        .collection(EMAIL_DELIVERY_JOBS_COLLECTION)
        .doc(deliveryJobId);
      let notifyCustomerId = "";
      let notifyCustomerUid = "";
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists) {
          throw notFound("Assisted creation request not found.");
        }
        const current = snap.data()!;
        const fromStatus = current.status as AssistedCreationStatus;
        const customerUid = String(current.customerUid ?? "");
        const customerId = String(current.customerId ?? "");
        if (!customerUid || !customerId) {
          throw failedPrecondition("This request is missing its customer linkage.");
        }
        notifyCustomerId = customerId;
        notifyCustomerUid = customerUid;
        const expectedPrefix = `assisted-creation/${customerUid}/${requestId}/proofs/`;
        if (!storagePath.startsWith(expectedPrefix)) {
          throw invalidArgument("Invalid proof storage path.");
        }

        assertAssistedCreationTransition({
          fromStatus,
          toStatus: "proof_ready",
          actor: "staff",
          hasProofAsset: true,
        });

        const existingProofs = Array.isArray(current.proofs)
          ? (current.proofs as AssistedCreationProof[])
          : [];
        if (existingProofs.some((p) => p.id === proofId || p.storagePath === storagePath)) {
          throw failedPrecondition("This proof was already attached.");
        }

        const proof: AssistedCreationProof = {
          id: proofId,
          storagePath,
          fileName,
          contentType,
          sizeBytes,
          ...(note ? { note } : {}),
          createdBy: caller.id,
          createdAt: Timestamp.now(),
        };

        const history = Array.isArray(current.revisionHistory) ? current.revisionHistory : [];
        tx.update(docRef, {
          status: "proof_ready",
          fulfillmentMode: "proof_image",
          suggestedCatalogDesign: null,
          proofs: [...existingProofs, proof],
          revisionHistory: appendRevision(history, {
            byUid: caller.id,
            byRole: "staff",
            note: note ?? "Proof sent to customer",
            fromStatus,
            toStatus: "proof_ready",
          }),
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.create(deliveryJobRef, {
          id: deliveryJobId,
          kind: "assisted_proof_ready",
          requestId,
          proofId,
          customerId,
          customerUid,
          provider: emailSettings.proofNoticeProvider,
          status: "pending",
          attemptCount: 0,
          maxAttempts: 5,
          createdBy: caller.id,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      try {
        const notificationId = buildAssistedProofReadyNotificationId(requestId, proofId);
        await createCustomerNotification({
          id: notificationId,
          customerId: notifyCustomerId,
          customerUid: notifyCustomerUid,
          kind: "assisted_proof_ready",
          title: buildCustomerNotificationTitle("assisted_proof_ready"),
          body: CUSTOMER_NOTIFICATION_PROOF_BODY,
          requestId,
          proofId,
        });
        console.info("[staffAddAssistedCreationProof] notification ok", {
          requestId,
          proofId,
          notificationId,
          customerUid: notifyCustomerUid,
        });
      } catch (notifyError) {
        console.error("[staffAddAssistedCreationProof] notification failed", {
          requestId,
          proofId,
          customerUid: notifyCustomerUid,
          customerId: notifyCustomerId,
          error: notifyError,
        });
      }

      return { requestId, status: "proof_ready", proofId };
    } catch (error) {
      mapHttpsError(error, "Unable to attach proof right now.");
    }
  },
);

export const staffSuggestAssistedCreationCatalogDesign = onCall(
  async (request): Promise<StaffSuggestAssistedCreationCatalogDesignResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerAdminCaller(caller);
      const data = (request.data ?? {}) as StaffSuggestAssistedCreationCatalogDesignRequest;
      const requestId = typeof data.requestId === "string" ? data.requestId.trim() : "";
      const designId = typeof data.designId === "string" ? data.designId.trim() : "";
      if (!requestId) {
        throw invalidArgument("Request id is required.");
      }
      if (!designId) {
        throw invalidArgument("Design id is required.");
      }
      const note = asTrimmedOptional(
        data.note,
        ASSISTED_CREATION_FIELD_LIMITS.staffNote,
        "Suggestion note",
      );

      const designSnap = await adminDb.collection("designs").doc(designId).get();
      if (!designSnap.exists) {
        throw notFound("Design not found.");
      }
      const designData = designSnap.data() ?? {};
      if (designData.status !== "ready") {
        throw failedPrecondition("Only ready Design Library designs can be suggested.");
      }
      const title =
        typeof designData.title === "string" && designData.title.trim()
          ? designData.title.trim()
          : "Library design";
      const previewPath =
        (typeof designData.previewPath === "string" && designData.previewPath.trim()) ||
        (typeof designData.thumbnailPath === "string" && designData.thumbnailPath.trim()) ||
        "";
      const artworkBackgroundSnapshots = buildAssistedCatalogShareArtworkBackgroundSnapshots(
        designData.artworkBackgroundHex,
      );

      const emailSettings = await loadEmailProviderSettings();
      const docRef = adminDb.collection(ASSISTED_CREATION_COLLECTION).doc(requestId);
      const deliveryJobId = createCatalogShareEmailJobId(requestId, designId);
      const deliveryJobRef = adminDb
        .collection(EMAIL_DELIVERY_JOBS_COLLECTION)
        .doc(deliveryJobId);
      let notifyCustomerId = "";
      let notifyCustomerUid = "";

      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists) {
          throw notFound("Assisted creation request not found.");
        }
        const current = snap.data()!;
        const fromStatus = current.status as AssistedCreationStatus;
        const customerUid = String(current.customerUid ?? "");
        const customerId = String(current.customerId ?? "");
        if (!customerUid || !customerId) {
          throw failedPrecondition("This request is missing its customer linkage.");
        }
        notifyCustomerId = customerId;
        notifyCustomerUid = customerUid;

        assertAssistedCreationTransition({
          fromStatus,
          toStatus: "proof_ready",
          actor: "staff",
          hasSuggestedCatalogDesign: true,
        });

        const suggestedAt = Timestamp.now();
        const suggestion: AssistedCreationSuggestedCatalogDesign = {
          designId,
          title,
          ...(previewPath ? { previewImageUrl: previewPath } : {}),
          ...(artworkBackgroundSnapshots.artworkBackgroundHex
            ? { artworkBackgroundHex: artworkBackgroundSnapshots.artworkBackgroundHex }
            : {}),
          suggestedAt,
          suggestedByUid: caller.id,
        };

        const existingProofs = Array.isArray(current.proofs)
          ? (current.proofs as AssistedCreationProof[])
          : [];
        // Proofs-array line for Studio/Portal Proofs tab (Design Library, not a PNG).
        // storagePath stays empty so terminal/expiry purge never touches catalog assets.
        const catalogProof: AssistedCreationProof = {
          id: `catalog-share-${designId}-${suggestedAt.toMillis()}`,
          kind: "catalog_share",
          storagePath: "",
          fileName: title,
          contentType: "",
          sizeBytes: 0,
          ...(note ? { note } : {}),
          createdBy: caller.id,
          createdAt: suggestedAt,
          catalogDesignId: designId,
          catalogDesignTitle: title,
          ...(previewPath ? { catalogPreviewImageUrl: previewPath } : {}),
          ...(artworkBackgroundSnapshots.catalogArtworkBackgroundHex
            ? {
                catalogArtworkBackgroundHex:
                  artworkBackgroundSnapshots.catalogArtworkBackgroundHex,
              }
            : {}),
        };

        const history = Array.isArray(current.revisionHistory) ? current.revisionHistory : [];
        const historyNote =
          note ??
          `Library design suggested: ${title}`;

        tx.update(docRef, {
          status: "proof_ready",
          fulfillmentMode: "catalog_share",
          suggestedCatalogDesign: suggestion,
          proofs: [...existingProofs, catalogProof],
          // Clear opposite fulfillment — catalog path does not use approvedProofId.
          approvedProofId: FieldValue.delete(),
          revisionHistory: appendRevision(history, {
            byUid: caller.id,
            byRole: "staff",
            note: historyNote,
            fromStatus,
            toStatus: "proof_ready",
          }),
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.create(deliveryJobRef, {
          id: deliveryJobId,
          kind: "assisted_catalog_share_ready",
          requestId,
          designId,
          proofId: "",
          customerId,
          customerUid,
          provider: emailSettings.proofNoticeProvider,
          status: "pending",
          attemptCount: 0,
          maxAttempts: 5,
          createdBy: caller.id,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      try {
        const notificationId = buildAssistedCatalogShareReadyNotificationId(requestId, designId);
        await createCustomerNotification({
          id: notificationId,
          customerId: notifyCustomerId,
          customerUid: notifyCustomerUid,
          kind: "assisted_catalog_share_ready",
          title: buildCustomerNotificationTitle("assisted_catalog_share_ready"),
          body: CUSTOMER_NOTIFICATION_CATALOG_SHARE_BODY,
          requestId,
        });
        console.info("[staffSuggestAssistedCreationCatalogDesign] notification ok", {
          requestId,
          designId,
          notificationId,
          customerUid: notifyCustomerUid,
        });
      } catch (notifyError) {
        console.error("[staffSuggestAssistedCreationCatalogDesign] notification failed", {
          requestId,
          designId,
          customerUid: notifyCustomerUid,
          customerId: notifyCustomerId,
          error: notifyError,
        });
      }

      return { requestId, status: "proof_ready", designId };
    } catch (error) {
      mapHttpsError(error, "Unable to suggest a library design right now.");
    }
  },
);

/**
 * Staff: attach final high-resolution artwork and complete the request
 * (`final_source_needed` → `approved`) in one write.
 */
export const staffAddAssistedCreationFinalSource = onCall(
  async (request): Promise<StaffAddAssistedCreationFinalSourceResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerAdminCaller(caller);
      const data = (request.data ?? {}) as StaffAddAssistedCreationFinalSourceRequest;
      const requestId = typeof data.requestId === "string" ? data.requestId.trim() : "";
      if (!requestId) {
        throw invalidArgument("Request id is required.");
      }
      const sourceIn = data.finalSource;
      if (!sourceIn || typeof sourceIn !== "object") {
        throw invalidArgument("Final artwork details are required.");
      }

      const sourceId = typeof sourceIn.id === "string" ? sourceIn.id.trim() : "";
      const storagePath =
        typeof sourceIn.storagePath === "string" ? sourceIn.storagePath.trim() : "";
      const contentType =
        typeof sourceIn.contentType === "string" ? sourceIn.contentType.trim() : "";
      const sizeBytes =
        typeof sourceIn.sizeBytes === "number" && Number.isFinite(sourceIn.sizeBytes)
          ? Math.floor(sourceIn.sizeBytes)
          : -1;
      const clientFileName =
        typeof sourceIn.fileName === "string" ? sourceIn.fileName.trim() : "";

      if (!sourceId || !storagePath || !contentType || sizeBytes <= 0) {
        throw invalidArgument("Final artwork metadata is incomplete.");
      }
      if (!(ASSISTED_CREATION_ALLOWED_PROOF_TYPES as readonly string[]).includes(contentType)) {
        throw invalidArgument("Final artwork must be JPEG, PNG, or WebP.");
      }
      if (sizeBytes > ASSISTED_CREATION_MAX_PROOF_BYTES) {
        throw invalidArgument("Final artwork file is too large.");
      }

      const friendlyName =
        clientFileName || buildAssistedCreationFinalArtworkDownloadFileName(contentType);

      const docRef = adminDb.collection(ASSISTED_CREATION_COLLECTION).doc(requestId);
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists) {
          throw notFound("Assisted creation request not found.");
        }
        const current = snap.data()!;
        const fromStatus = current.status as AssistedCreationStatus;
        const customerUid = String(current.customerUid ?? "");
        if (!customerUid) {
          throw failedPrecondition("This request is missing its customer linkage.");
        }
        const expectedPrefix = `assisted-creation/${customerUid}/${requestId}/final/`;
        if (!storagePath.startsWith(expectedPrefix)) {
          throw invalidArgument("Invalid final artwork storage path.");
        }
        if (current.finalSource && typeof current.finalSource === "object") {
          throw failedPrecondition("Final artwork was already attached.");
        }

        assertAssistedCreationTransition({
          fromStatus,
          toStatus: "approved",
          actor: "staff",
          hasFinalSource: true,
        });

        const finalSource: AssistedCreationFinalSource = {
          id: sourceId,
          storagePath,
          fileName: friendlyName,
          contentType,
          sizeBytes,
          uploadedByUid: caller.id,
          uploadedAt: Timestamp.now(),
        };

        const history = Array.isArray(current.revisionHistory) ? current.revisionHistory : [];
        tx.update(docRef, {
          status: "approved",
          finalSource,
          revisionHistory: appendRevision(history, {
            byUid: caller.id,
            byRole: "staff",
            note: "Final artwork uploaded",
            fromStatus,
            toStatus: "approved",
          }),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      return { requestId, status: "approved", finalSourceId: sourceId };
    } catch (error) {
      mapHttpsError(error, "Unable to attach final artwork right now.");
    }
  },
);
