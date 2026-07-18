import type { EmailProviderId } from "../../../../packages/shared/src/constants/emailProviders.constants";
import { EmailDeliveryError } from "./email.types";

export function resolveEmailApiKey(
  provider: EmailProviderId,
  keys: { resend: string; brevo: string },
): string {
  const apiKey = provider === "brevo" ? keys.brevo : keys.resend;
  if (!apiKey.trim()) {
    throw new EmailDeliveryError("provider_rejected", false);
  }
  return apiKey;
}
