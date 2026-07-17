import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  EMAIL_PROVIDER_SETTINGS_DOC_ID,
  isEmailProviderId,
  type EmailProviderSettings,
} from "../../packages/shared/src/constants/emailProviders.constants";
import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";

interface UpdateEmailProviderSettingsRequest {
  inviteProvider: unknown;
  proofNoticeProvider: unknown;
}

export const updateEmailProviderSettings = onCall(
  async (request): Promise<EmailProviderSettings> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    const caller = await loadCallerProfile(request.auth.uid);
    if (!caller.isActive || caller.role !== "owner") {
      throw permissionDenied("Only active owners can update email providers.");
    }

    const data = request.data as UpdateEmailProviderSettingsRequest | null;
    if (
      !data ||
      !isEmailProviderId(data.inviteProvider) ||
      !isEmailProviderId(data.proofNoticeProvider)
    ) {
      throw invalidArgument("Only the Resend provider is currently available.");
    }

    const settings: EmailProviderSettings = {
      inviteProvider: data.inviteProvider,
      proofNoticeProvider: data.proofNoticeProvider,
      updatedBy: request.auth.uid,
    };
    await adminDb.collection("settings").doc(EMAIL_PROVIDER_SETTINGS_DOC_ID).set({
      ...settings,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return settings;
  },
);
