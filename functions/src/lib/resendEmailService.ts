import { createHash } from "node:crypto";

import type { EmailProviderId } from "../../../packages/shared/src/constants/emailProviders.constants";
import { sendEmail } from "./email/emailRouter";
import {
  buildCustomerInvitationEmail,
  buildTeamInvitationEmail,
} from "./email/emailTemplates";

function invitationIdempotencyKey(kind: string, email: string, resetLink: string): string {
  return `${kind}-${createHash("sha256").update(`${email}:${resetLink}`).digest("hex")}`;
}

interface SendTeamInvitationEmailInput {
  apiKey: string;
  provider: EmailProviderId;
  fromEmail: string;
  toEmail: string;
  displayName: string;
  role: string;
  resetLink: string;
}

export async function sendTeamInvitationEmail(input: SendTeamInvitationEmailInput): Promise<boolean> {
  try {
    await sendEmail({
      provider: input.provider,
      apiKey: input.apiKey,
      idempotencyKey: invitationIdempotencyKey("team-invite", input.toEmail, input.resetLink),
      message: buildTeamInvitationEmail({
        from: input.fromEmail,
        to: input.toEmail,
        displayName: input.displayName,
        role: input.role,
        resetLink: input.resetLink,
      }),
    });
    return true;
  } catch {
    return false;
  }
}

interface SendCustomerPortalInvitationEmailInput {
  apiKey: string;
  provider: EmailProviderId;
  fromEmail: string;
  toEmail: string;
  displayName: string;
  username: string;
  resetLink: string;
}

export async function sendCustomerPortalInvitationEmail(
  input: SendCustomerPortalInvitationEmailInput,
): Promise<boolean> {
  try {
    await sendEmail({
      provider: input.provider,
      apiKey: input.apiKey,
      idempotencyKey: invitationIdempotencyKey(
        "customer-invite",
        input.toEmail,
        input.resetLink,
      ),
      message: buildCustomerInvitationEmail({
        from: input.fromEmail,
        to: input.toEmail,
        displayName: input.displayName,
        username: input.username,
        resetLink: input.resetLink,
      }),
    });
    return true;
  } catch {
    return false;
  }
}
