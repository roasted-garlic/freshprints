import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

import {
  EMAIL_DELIVERY_JOBS_COLLECTION,
  isEmailProviderId,
} from "../../packages/shared/src/constants/emailProviders.constants";
import { adminDb } from "./lib/admin";
import { sendEmail } from "./lib/email/emailRouter";
import { buildProofReadyEmail } from "./lib/email/emailTemplates";
import { EmailDeliveryError } from "./lib/email/email.types";
import {
  canClaimEmailJob,
  EMAIL_DELIVERY_MAX_ATTEMPTS,
  shouldRetryEmailFailure,
} from "./lib/email/emailDeliveryPolicy";
import { resolveProofRecipient } from "./lib/email/proofRecipient";
import { resolveProofReviewUrl } from "./lib/email/portalUrlResolver";
import { proofNoticeFromEmail, resendApiKeySecret } from "./lib/secrets";

const LEASE_MS = 2 * 60 * 1000;

interface ClaimedProofJob {
  id: string;
  requestId: string;
  proofId: string;
  customerId: string;
  customerUid: string;
  provider: "resend";
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
      requestId: String(data.requestId ?? ""),
      proofId: String(data.proofId ?? ""),
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

export const onEmailDeliveryJobCreated = onDocumentCreated(
  {
    document: `${EMAIL_DELIVERY_JOBS_COLLECTION}/{jobId}`,
    retry: true,
    secrets: [resendApiKeySecret],
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
      const recipient = await resolveProofRecipient(job);
      const result = await sendEmail({
        provider: job.provider,
        apiKey: resendApiKeySecret.value(),
        idempotencyKey: job.id,
        message: buildProofReadyEmail({
          from: proofNoticeFromEmail.value(),
          to: recipient.email,
          displayName: recipient.displayName,
          reviewUrl: resolveProofReviewUrl(),
        }),
      });
      await markSent(job, result.providerMessageId);
      logger.info("Email delivery job sent.", {
        jobId: job.id,
        requestId: job.requestId,
        proofId: job.proofId,
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
