import { defineSecret, defineString } from "firebase-functions/params";

export const resendApiKeySecret = defineSecret("RESEND_API_KEY");

/** Brevo product HTTP API key (not Cursor MCP `BREVO_MCP_TOKEN`). See docs/workflow/setup/brevo-email-setup.md */
export const brevoApiKeySecret = defineSecret("BREVO_API_KEY");

export const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

/** Etsy Open API `x-api-key` value (`keystring:shared_secret`). Bound only to searchEtsyRecommendations. */
export const etsyXApiKeySecret = defineSecret("ETSY_X_API_KEY");

/**
 * Must match a sender verified for the selected provider (Resend and/or Brevo).
 * See docs/workflow/setup/resend-email-setup.md and brevo-email-setup.md
 */
export const invitationFromEmail = defineString("INVITATION_FROM_EMAIL", {
  default: "Fresh Prints <team@funkyfreshprints.com>",
});

/** Must match a sender verified for the selected provider (Resend and/or Brevo). */
export const proofNoticeFromEmail = defineString("PROOF_NOTICE_FROM_EMAIL", {
  default: "Fresh Prints <team@funkyfreshprints.com>",
});
