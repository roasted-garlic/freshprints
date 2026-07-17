import type { EmailMessage } from "./email.types";

export function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildTeamInvitationEmail(input: {
  from: string;
  to: string;
  displayName: string;
  role: string;
  resetLink: string;
}): EmailMessage {
  return {
    from: input.from,
    to: input.to,
    subject: "You're invited to Fresh Prints Studio",
    html: `<p>Hi ${escapeEmailHtml(input.displayName)},</p>
<p>You were invited to Fresh Prints Studio as <strong>${escapeEmailHtml(input.role)}</strong>.</p>
<p><a href="${escapeEmailHtml(input.resetLink)}">Set your password</a> to sign in to Fresh Prints Studio.</p>
<p>If you did not expect this invitation, you can ignore this email.</p>`,
  };
}

export function buildCustomerInvitationEmail(input: {
  from: string;
  to: string;
  displayName: string;
  username: string;
  resetLink: string;
}): EmailMessage {
  return {
    from: input.from,
    to: input.to,
    subject: "You're invited to Fresh Prints Portal",
    html: `<p>Hi ${escapeEmailHtml(input.displayName)},</p>
<p>Fresh Prints created a customer account for you with username <strong>${escapeEmailHtml(input.username)}</strong>.</p>
<p><a href="${escapeEmailHtml(input.resetLink)}">Set your password</a> to sign in to Fresh Prints Portal and manage your print requests.</p>
<p>If you did not expect this invitation, you can ignore this email.</p>`,
  };
}

export function buildProofReadyEmail(input: {
  from: string;
  to: string;
  displayName: string;
  reviewUrl: string;
}): EmailMessage {
  return {
    from: input.from,
    to: input.to,
    subject: "Your Fresh Prints proof is ready",
    html: `<p>Hi ${escapeEmailHtml(input.displayName)},</p>
<p>Your Fresh Prints design proof is ready for review.</p>
<p><a href="${escapeEmailHtml(input.reviewUrl)}">Review your proof</a> in Fresh Prints Portal.</p>
<p>You can approve it or request revisions from the proof page.</p>`,
  };
}
