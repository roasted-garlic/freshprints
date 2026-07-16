interface SendResendEmailInput {
  apiKey: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  html: string;
}

import { logger } from "firebase-functions";

async function sendResendEmail(input: SendResendEmailInput): Promise<boolean> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: input.fromEmail,
        to: [input.toEmail],
        subject: input.subject,
        html: input.html,
      }),
    });

    if (!response.ok) {
      const responseBody = await response.text();
      logger.warn("Resend email rejected.", {
        toEmail: input.toEmail,
        fromEmail: input.fromEmail,
        status: response.status,
        responseBody,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Resend email request failed.", {
      toEmail: input.toEmail,
      fromEmail: input.fromEmail,
      message: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}

interface SendTeamInvitationEmailInput {
  apiKey: string;
  fromEmail: string;
  toEmail: string;
  displayName: string;
  role: string;
  resetLink: string;
}

export async function sendTeamInvitationEmail(input: SendTeamInvitationEmailInput): Promise<boolean> {
  return sendResendEmail({
    apiKey: input.apiKey,
    fromEmail: input.fromEmail,
    toEmail: input.toEmail,
    subject: "You're invited to Fresh Prints Studio",
    html: `
      <p>Hi ${input.displayName},</p>
      <p>You were invited to Fresh Prints Studio as <strong>${input.role}</strong>.</p>
      <p><a href="${input.resetLink}">Set your password</a> to sign in to Fresh Prints Studio.</p>
      <p>If you did not expect this invitation, you can ignore this email.</p>
    `,
  });
}

interface SendCustomerPortalInvitationEmailInput {
  apiKey: string;
  fromEmail: string;
  toEmail: string;
  displayName: string;
  username: string;
  resetLink: string;
}

export async function sendCustomerPortalInvitationEmail(
  input: SendCustomerPortalInvitationEmailInput,
): Promise<boolean> {
  return sendResendEmail({
    apiKey: input.apiKey,
    fromEmail: input.fromEmail,
    toEmail: input.toEmail,
    subject: "You're invited to Fresh Prints Portal",
    html: `
      <p>Hi ${input.displayName},</p>
      <p>Fresh Prints created a customer account for you with username <strong>${input.username}</strong>.</p>
      <p><a href="${input.resetLink}">Set your password</a> to sign in to Fresh Prints Portal and manage your print requests.</p>
      <p>If you did not expect this invitation, you can ignore this email.</p>
    `,
  });
}
