import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

import {
  ASSISTED_CREATION_COLLECTION,
  type AssistedCreationStatus,
} from "../../packages/shared/src/constants/assistedCreation/assistedCreation.constants";
import type { AssistedCreationRevisionEntry } from "../../packages/shared/src/types/assistedCreation/assistedCreation.types";
import {
  EMAIL_DELIVERY_JOBS_COLLECTION,
  isEmailProviderId,
  type EmailProviderId,
} from "../../packages/shared/src/constants/emailProviders.constants";
import {
  ASSISTED_CREATION_PROOF_EMAIL_SENT_NOTE,
  isAssistedProofEmailOptedIn,
} from "../../packages/shared/src/utils/assistedCreationHistory";
import { adminDb } from "./lib/admin";
import { sendEmail } from "./lib/email/emailRouter";
import { buildCatalogShareReadyEmail, buildProofReadyEmail } from "./lib/email/emailTemplates";
import { EmailDeliveryError } from "./lib/email/email.types";
import {
  canClaimEmailJob,
  EMAIL_DELIVERY_MAX_ATTEMPTS,
  shouldRetryEmailFailure,
} from "./lib/email/emailDeliveryPolicy";
import { resolveProofRecipient } from "./lib/email/proofRecipient";
import { resolveProofReviewUrl } from "./lib/email/portalUrlResolver";
import { resolveEmailApiKey } from "./lib/email/resolveEmailApiKey";
import { brevoApiKeySecret, proofNoticeFromEmail, resendApiKeySecret } from "./lib/secrets";

const LEASE_MS = 2 * 60 * 1000;

interface ClaimedProofJob {
  id: string;
  kind: string;
  requestId: string;
  proofId: string;
  designId: string;
  customerId: string;
  customerUid: string;
  provider: EmailProviderId;
  attemptCount: number;
}

async function claimJob(jobId: string): Promise<ClaimedProofJob | null> {
  const ref = adminDb.collection(EMAIL_DELIVERY_JOBS_COLLECTION).doc(jobId);
  return adminDb.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) {
      return null;
    }
    const data = snapshot.data()!;
    const status = data.status;
    const leaseExpiresAt = data.leaseExpiresAt as Timestamp | undefined;
    if (
      !canClaimEmailJob({
        status,
        attemptCount: data.attemptCount,
        leaseExpiresAtMs: leaseExpiresAt?.toMillis(),
        nowMs: Date.now(),
      })
    ) {
      return null;
    }

    const attemptCount = Number.isInteger(data.attemptCount) ? data.attemptCount + 1 : 1;
    if (attemptCount > EMAIL_DELIVERY_MAX_ATTEMPTS || !isEmailProviderId(data.provider)) {
      tx.update(ref, {
        status: "failed",
        lastErrorCode:
          attemptCount > EMAIL_DELIVERY_MAX_ATTEMPTS ? "attempts_exhausted" : "provider_rejected",
        updatedAt: FieldValue.serverTimestamp(),
      });
      return null;
    }

    const claimed: ClaimedProofJob = {
      id: jobId,
      kind: typeof data.kind === "string" ? data.kind : "assisted_proof_ready",
      requestId: String(data.requestId ?? ""),
      proofId: String(data.proofId ?? ""),
      designId: String(data.designId ?? ""),
      customerId: String(data.customerId ?? ""),
      customerUid: String(data.customerUid ?? ""),
      provider: data.provider,
      attemptCount,
    };
    tx.update(ref, {
      status: "sending",
      attemptCount,
      leaseExpiresAt: Timestamp.fromMillis(Date.now() + LEASE_MS),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return claimed;
  });
}

async function markSent(job: ClaimedProofJob, providerMessageId: string): Promise<void> {
  await adminDb.collection(EMAIL_DELIVERY_JOBS_COLLECTION).doc(job.id).update({
    status: "sent",
    providerMessageId,
    sentAt: FieldValue.serverTimestamp(),
    leaseExpiresAt: FieldValue.delete(),
    lastErrorCode: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function markNonRetryableFailure(job: ClaimedProofJob, errorCode: string): Promise<void> {
  await adminDb.collection(EMAIL_DELIVERY_JOBS_COLLECTION).doc(job.id).update({
    status: "failed",
    lastErrorCode: errorCode,
    leaseExpiresAt: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function markFailure(job: ClaimedProofJob, error: EmailDeliveryError): Promise<boolean> {
  const retry = shouldRetryEmailFailure(error.transient, job.attemptCount);
  await adminDb.collection(EMAIL_DELIVERY_JOBS_COLLECTION).doc(job.id).update({
    status: retry ? "pending" : "failed",
    lastErrorCode:
      retry
        ? error.code
        : job.attemptCount >= EMAIL_DELIVERY_MAX_ATTEMPTS
          ? "attempts_exhausted"
          : error.code,
    leaseExpiresAt: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return retry;
}

function appendRevision(
  history: AssistedCreationRevisionEntry[],
  entry: Omit<AssistedCreationRevisionEntry, "at"> & { at?: unknown },
): AssistedCreationRevisionEntry[] {
  return [
    ...history,
    {
      ...entry,
      at: entry.at ?? Timestamp.now(),
    },
  ];
}

/** Append History only after a successful send; idempotent per delivery job id. */
async function appendProofEmailSentHistory(job: ClaimedProofJob): Promise<void> {
  if (!job.requestId) {
    return;
  }
  const docRef = adminDb.collection(ASSISTED_CREATION_COLLECTION).doc(job.requestId);
  const note =
    job.kind === "assisted_catalog_share_ready"
      ? "Library-match email sent"
      : ASSISTED_CREATION_PROOF_EMAIL_SENT_NOTE;
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) {
      return;
    }
    const current = snap.data()!;
    const history = Array.isArray(current.revisionHistory)
      ? (current.revisionHistory as AssistedCreationRevisionEntry[])
      : [];
    if (history.some((entry) => entry.emailDeliveryJobId === job.id)) {
      return;
    }
    const status = current.status as AssistedCreationStatus;
    tx.update(docRef, {
      revisionHistory: appendRevision(history, {
        byUid: "system",
        byRole: "system",
        note,
        fromStatus: status,
        toStatus: status,
        emailDeliveryJobId: job.id,
      }),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export const onEmailDeliveryJobCreated = onDocumentCreated(
  {
    document: `${EMAIL_DELIVERY_JOBS_COLLECTION}/{jobId}`,
    retry: true,
    secrets: [resendApiKeySecret, brevoApiKeySecret],
  },
  async (event) => {
    const job = await claimJob(event.params.jobId);
    if (!job) {
      const current = await adminDb
        .collection(EMAIL_DELIVERY_JOBS_COLLECTION)
        .doc(event.params.jobId)
        .get();
      if (current.data()?.status === "sending") {
        // Keep Eventarc retrying until a lease left by an interrupted worker expires.
        throw new Error("email_job_lease_active");
      }
      return;
    }

    try {
      const customerSnap = await adminDb.collection("customers").doc(job.customerId).get();
      const customerData = customerSnap.exists ? customerSnap.data() : undefined;
      if (!isAssistedProofEmailOptedIn(customerData?.assistedProofEmailOptIn)) {
        await markNonRetryableFailure(job, "customer_opted_out");
        logger.info("Email delivery skipped; customer opted out of proof-ready emails.", {
          jobId: job.id,
          requestId: job.requestId,
          proofId: job.proofId,
        });
        return;
      }

      const recipient = await resolveProofRecipient(job);
      const reviewUrl = resolveProofReviewUrl();
      const message =
        job.kind === "assisted_catalog_share_ready"
          ? buildCatalogShareReadyEmail({
              from: proofNoticeFromEmail.value(),
              to: recipient.email,
              displayName: recipient.displayName,
              reviewUrl,
            })
          : buildProofReadyEmail({
              from: proofNoticeFromEmail.value(),
              to: recipient.email,
              displayName: recipient.displayName,
              reviewUrl,
            });
      const result = await sendEmail({
        provider: job.provider,
        apiKey: resolveEmailApiKey(job.provider, {
          resend: resendApiKeySecret.value(),
          brevo: brevoApiKeySecret.value(),
        }),
        idempotencyKey: job.id,
        message,
      });
      await markSent(job, result.providerMessageId);
      await appendProofEmailSentHistory(job);
      logger.info("Email delivery job sent.", {
        jobId: job.id,
        kind: job.kind,
        requestId: job.requestId,
        proofId: job.proofId,
        designId: job.designId,
        provider: job.provider,
      });
    } catch (unknownError) {
      const error =
        unknownError instanceof EmailDeliveryError
          ? unknownError
          : new EmailDeliveryError("provider_unavailable", true);
      const retry = await markFailure(job, error);
      logger.warn("Email delivery job failed.", {
        jobId: job.id,
        requestId: job.requestId,
        proofId: job.proofId,
        provider: job.provider,
        errorCode: error.code,
        retry,
      });
      if (retry) {
        throw error;
      }
    }
  },
);
