import type { EmailProviderId } from "../../../../packages/shared/src/constants/emailProviders.constants";

export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export interface EmailDeliveryResult {
  provider: EmailProviderId;
  providerMessageId: string;
}

export interface EmailProvider {
  readonly id: EmailProviderId;
  send(message: EmailMessage, idempotencyKey: string): Promise<EmailDeliveryResult>;
}

export type EmailDeliveryErrorCode =
  | "provider_timeout"
  | "provider_rate_limited"
  | "provider_unavailable"
  | "provider_rejected"
  | "invalid_recipient"
  | "recipient_link_mismatch"
  | "portal_environment_unknown"
  | "attempts_exhausted";

export class EmailDeliveryError extends Error {
  constructor(
    readonly code: EmailDeliveryErrorCode,
    readonly transient: boolean,
  ) {
    super(code);
    this.name = "EmailDeliveryError";
  }
}
