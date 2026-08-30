import { formatCustomerIdentityLabel } from "../utils/formatCustomerIdentityLabel";

export function formatDesignIssueReportSubmitter(input: {
  customerDisplayNameSnapshot?: string | null;
  customerUsernameSnapshot?: string | null;
  customerUsernameAtCreationSnapshot?: string | null;
  customerDisplayNameAtCreationSnapshot?: string | null;
}): string {
  const label = formatCustomerIdentityLabel({
    currentUsername: input.customerUsernameSnapshot,
    usernameAtCreation: input.customerUsernameAtCreationSnapshot,
    currentDisplayName: input.customerDisplayNameSnapshot,
    displayNameAtCreation: input.customerDisplayNameAtCreationSnapshot,
  });

  return label === "Unknown customer" ? "Anonymous" : label;
}
