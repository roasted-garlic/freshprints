import type { TeamUserRole } from "./types";

export const teamInvitationEmailSubject = "You're invited to Fresh Prints";

function formatRoleLabel(role: TeamUserRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildTeamInvitationEmailHtml(
  displayName: string,
  role: TeamUserRole,
  resetLink: string,
): string {
  const safeDisplayName = escapeHtml(displayName);
  const safeRole = escapeHtml(formatRoleLabel(role));
  const safeResetLink = escapeHtml(resetLink);

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e3e7ee;border-radius:8px;padding:32px;">
            <tr>
              <td>
                <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;color:#111827;">You're invited to Fresh Prints</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">Hi ${safeDisplayName},</p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
                  A Fresh Prints ${safeRole} account has been created for you. Use the button below to set your password and sign in to the desktop admin app.
                </p>
                <p style="margin:0 0 24px;text-align:center;">
                  <a href="${safeResetLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 20px;border-radius:6px;">
                    Set up your password
                  </a>
                </p>
                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#6b7280;">
                  If the button does not work, copy and paste this link into your browser:
                </p>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.6;word-break:break-all;">
                  <a href="${safeResetLink}" style="color:#2563eb;">${safeResetLink}</a>
                </p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">
                  Fresh Prints
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildTeamInvitationEmailText(
  displayName: string,
  role: TeamUserRole,
  resetLink: string,
): string {
  const roleLabel = formatRoleLabel(role);

  return [
    "You're invited to Fresh Prints",
    "",
    `Hi ${displayName},`,
    "",
    `A Fresh Prints ${roleLabel} account has been created for you.`,
    "Use the link below to set your password and sign in to the desktop admin app:",
    "",
    resetLink,
    "",
    "Fresh Prints",
  ].join("\n");
}
