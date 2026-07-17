import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import {
  ASSISTED_CREATION_ALLOWED_PROOF_TYPES,
  ASSISTED_CREATION_COLLECTION,
  ASSISTED_CREATION_FIELD_LIMITS,
  ASSISTED_CREATION_MAX_PROOF_BYTES,
  ASSISTED_CREATION_OPEN_STATUSES,
  ASSISTED_CREATION_SCHEMA_VERSION,
  canCustomerUpdateAssistedCreation,
  type AssistedCreationStatus,
} from "../../packages/shared/src/constants/assistedCreation/assistedCreation.constants";
import type {
  CancelAssistedCreationRequestRequest,
  CancelAssistedCreationRequestResponse,
  CustomerRespondToAssistedCreationProofRequest,
  CustomerRespondToAssistedCreationProofResponse,
  CustomerUpdateAssistedCreationRequestRequest,
  CustomerUpdateAssistedCreationRequestResponse,
  StaffAddAssistedCreationProofRequest,
  StaffAddAssistedCreationProofResponse,
  StaffUpdateAssistedCreationStatusRequest,
  StaffUpdateAssistedCreationStatusResponse,
  SubmitAssistedCreationRequestRequest,
  SubmitAssistedCreationRequestResponse,
} from "../../packages/shared/src/types/assistedCreation/assistedCreationActions.types";
import type {
  AssistedCreationProof,
  AssistedCreationReferenceImage,
  AssistedCreationRevisionEntry,
} from "../../packages/shared/src/types/assistedCreation/assistedCreation.types";
import { EMAIL_DELIVERY_JOBS_COLLECTION } from "../../packages/shared/src/constants/emailProviders.constants";
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
import { createProofEmailJobId } from "./lib/email/emailJobIdentity";

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
    default:
      return action;
  }
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
          revisionHistory: appendRevision(history, {
            byUid: portalCustomer.customerUid,
            byRole: "customer",
            note: "Cancelled by customer",
            fromStatus,
            toStatus: "cancelled",
          }),
          updatedAt: FieldValue.serverTimestamp(),
        });
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
        const historyNote = updateNote
          ? `Customer updated request — ${updateNote}`
          : "Customer updated request";

        tx.update(docRef, {
          answers: answersForFirestore(answers),
          referenceImages,
          revisionHistory: appendRevision(history, {
            byUid: portalCustomer.customerUid,
            byRole: "customer",
            note: historyNote,
            fromStatus,
            toStatus: "submitted",
          }),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      return { requestId, status: "submitted" };
    } catch (error) {
      mapHttpsError(error, "Unable to update your assisted creation request right now.");
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

      const toStatus: AssistedCreationStatus =
        data.decision === "approve" ? "approved" : "revision_requested";

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

      const historyNote =
        toStatus === "approved"
          ? [
              "Customer approved proof",
              rating != null ? `(rated ${rating}/5)` : null,
              approvalNote ? `— ${approvalNote}` : null,
            ]
              .filter(Boolean)
              .join(" ")
          : (revisionNote ?? "");

      const docRef = adminDb.collection(ASSISTED_CREATION_COLLECTION).doc(requestId);
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
        assertAssistedCreationTransition({
          fromStatus,
          toStatus,
          actor: "customer",
          revisionNote,
        });
        const history = Array.isArray(current.revisionHistory) ? current.revisionHistory : [];
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
        if (toStatus === "approved") {
          if (rating != null) {
            update.customerRating = rating;
          }
          if (approvalNote) {
            update.customerApprovalNote = approvalNote;
          }
        }
        tx.update(docRef, update);
      });

      return { requestId, status: toStatus };
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

      const actionToStatus: Record<
        StaffUpdateAssistedCreationStatusRequest["action"],
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

      const docRef = adminDb.collection(ASSISTED_CREATION_COLLECTION).doc(requestId);
      let nextStatus: AssistedCreationStatus = toStatus;

      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists) {
          throw notFound("Assisted creation request not found.");
        }
        const current = snap.data()!;
        const fromStatus = current.status as AssistedCreationStatus;
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
        tx.update(docRef, patch);
      });

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
      const docRef = adminDb.collection(ASSISTED_CREATION_COLLECTION).doc(requestId);
      const deliveryJobId = createProofEmailJobId(requestId, proofId);
      const deliveryJobRef = adminDb
        .collection(EMAIL_DELIVERY_JOBS_COLLECTION)
        .doc(deliveryJobId);
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

      return { requestId, status: "proof_ready", proofId };
    } catch (error) {
      mapHttpsError(error, "Unable to attach proof right now.");
    }
  },
);
