import { logger } from "firebase-functions";

import {
  EMAIL_PROVIDER_SETTINGS_DOC_ID,
  isEmailProviderId,
  resolveEmailProviderSettings,
  type EmailProviderSettings,
} from "../../../../packages/shared/src/constants/emailProviders.constants";
import { adminDb } from "../admin";
import { failedPrecondition } from "../errors";

/**
 * Load Studio email provider settings. Missing fields still default to Resend.
 * A *stored* unrecognized provider id (deploy skew) must not silently become Resend —
 * that previously caused Brevo settings to enqueue Resend proof jobs.
 */
export async function loadEmailProviderSettings(): Promise<EmailProviderSettings> {
  const snapshot = await adminDb.collection("settings").doc(EMAIL_PROVIDER_SETTINGS_DOC_ID).get();
  const data = snapshot.data();
  for (const field of ["inviteProvider", "proofNoticeProvider"] as const) {
    const raw = data?.[field];
    if (raw === undefined || raw === null || raw === "") {
      continue;
    }
    if (!isEmailProviderId(raw)) {
      logger.error("Unrecognized email provider in settings; refusing silent Resend fallback.", {
        field,
        rawType: typeof raw,
      });
      throw failedPrecondition(
        "Email provider settings are incompatible with this server build. Redeploy email Functions.",
      );
    }
  }
  return resolveEmailProviderSettings(data);
}
