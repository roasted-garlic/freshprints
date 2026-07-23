/**
 * Presentation helper for deleted customer usernames.
 * Canonical stored username must remain unchanged; append "(Deleted)" only when rendering.
 */
export function formatCustomerUsernameForDisplay(
  username: string | null | undefined,
  options?: { isDeleted?: boolean | null },
): string {
  const trimmed = typeof username === "string" ? username.trim() : "";
  if (!trimmed) {
    return options?.isDeleted ? "(Deleted)" : "Unknown customer";
  }

  if (options?.isDeleted) {
    return `${trimmed} (Deleted)`;
  }

  return trimmed;
}
