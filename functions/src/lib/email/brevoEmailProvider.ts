import { createHash } from "node:crypto";

import { EmailDeliveryError, type EmailProvider } from "./email.types";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const DEFAULT_TIMEOUT_MS = 10_000;

interface BrevoResponse {
  messageId?: unknown;
}

/** Parse `Name <email@domain>` or bare email into Brevo sender fields. */
export function parseEmailFromAddress(from: string): { email: string; name?: string } {
  const trimmed = from.trim();
  const match = /^(.+?)\s*<([^>]+)>$/.exec(trimmed);
  if (match) {
    const name = match[1].trim().replace(/^["']|["']$/g, "");
    const email = match[2].trim();
    return name ? { email, name } : { email };
  }
  return { email: trimmed };
}

/**
 * Brevo batch idempotency expects a UUID-shaped key. Derive a stable UUID from our
 * Firestore job id; job-state dedupe remains the source of truth if Brevo rejects it.
 */
export function brevoIdempotencyKey(idempotencyKey: string): string {
  const hex = createHash("sha256").update(idempotencyKey).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function createBrevoEmailProvider(
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): EmailProvider {
  return {
    id: "brevo",
    async send(message, idempotencyKey) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const sender = parseEmailFromAddress(message.from);

      try {
        const response = await fetchImpl(BREVO_ENDPOINT, {
          method: "POST",
          headers: {
            "api-key": apiKey,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sender,
            to: [{ email: message.to }],
            subject: message.subject,
            htmlContent: message.html,
            headers: {
              idempotencyKey: brevoIdempotencyKey(idempotencyKey),
            },
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

        const body = (await response.json()) as BrevoResponse;
        if (typeof body.messageId !== "string" || !body.messageId) {
          throw new EmailDeliveryError("provider_unavailable", true);
        }
        return { provider: "brevo", providerMessageId: body.messageId };
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
