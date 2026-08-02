export function formatDesignIssueReportSubmitter(input: {
  customerDisplayNameSnapshot?: string | null;
  customerUsernameSnapshot?: string | null;
}): string {
  const displayName = typeof input.customerDisplayNameSnapshot === "string" ? input.customerDisplayNameSnapshot.trim() : "";
  if (displayName) return displayName;
  const username = typeof input.customerUsernameSnapshot === "string" ? input.customerUsernameSnapshot.trim() : "";
  if (username) return username;
  return "Anonymous";
}
