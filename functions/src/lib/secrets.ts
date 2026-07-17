import { defineSecret, defineString } from "firebase-functions/params";

export const resendApiKeySecret = defineSecret("RESEND_API_KEY");
export const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

/** Etsy Open API `x-api-key` value (`keystring:shared_secret`). Bound only to searchEtsyRecommendations. */
export const etsyXApiKeySecret = defineSecret("ETSY_X_API_KEY");

export const portalBaseUrl = defineString("PORTAL_BASE_URL", {
  default: "http://localhost:3000",
});

/** Must match a sender on a domain verified in Resend. See docs/workflow/setup/resend-email-setup.md */
export const invitationFromEmail = defineString("INVITATION_FROM_EMAIL", {
  default: "Fresh Prints <team@funkyfreshprints.com>",
});

/** Must match a sender on a domain verified in Resend. */
export const proofNoticeFromEmail = defineString("PROOF_NOTICE_FROM_EMAIL", {
  default: "Fresh Prints <team@funkyfreshprints.com>",
});
