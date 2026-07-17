import { EmailDeliveryError, type EmailProvider } from "./email.types";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_TIMEOUT_MS = 10_000;

interface ResendResponse {
  id?: unknown;
}

export function createResendEmailProvider(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): EmailProvider {
  return {
    id: "resend",
    async send(message, idempotencyKey) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(RESEND_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey.slice(0, 256),
          },
          body: JSON.stringify({
            from: message.from,
            to: [message.to],
            subject: message.subject,
            html: message.html,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 429) {
            throw new EmailDeliveryError("provider_rate_limited", true);
          }
          if (response.status >= 500) {
            throw new EmailDeliveryError("provider_unavailable", true);
          }
          throw new EmailDeliveryError("provider_rejected", false);
        }

        const body = (await response.json()) as ResendResponse;
        if (typeof body.id !== "string" || !body.id) {
          throw new EmailDeliveryError("provider_unavailable", true);
        }
        return { provider: "resend", providerMessageId: body.id };
      } catch (error) {
        if (error instanceof EmailDeliveryError) {
          throw error;
        }
        if (error instanceof Error && error.name === "AbortError") {
          throw new EmailDeliveryError("provider_timeout", true);
        }
        throw new EmailDeliveryError("provider_unavailable", true);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
