import type { EmailProviderId } from "../../../../packages/shared/src/constants/emailProviders.constants";
import { createResendEmailProvider } from "./resendEmailProvider";
import type { EmailMessage, EmailDeliveryResult } from "./email.types";

export async function sendEmail(input: {
  provider: EmailProviderId;
  apiKey: string;
  message: EmailMessage;
  idempotencyKey: string;
}): Promise<EmailDeliveryResult> {
  switch (input.provider) {
    case "resend":
      return createResendEmailProvider(input.apiKey).send(input.message, input.idempotencyKey);
  }
}
