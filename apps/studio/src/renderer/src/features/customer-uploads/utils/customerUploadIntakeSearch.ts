import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

/** Match intake uploader by display name and/or username (substring, case-insensitive). */
export function filterCustomersForIntakeSearch(
  customers: readonly Customer[],
  searchQuery: string,
): Customer[] {
  const normalizedQuery = normalizeSearchValue(searchQuery);
  if (!normalizedQuery) {
    return [];
  }

  return customers.filter((customer) =>
    [customer.displayName, customer.username ?? ""].some((value) =>
      value.toLowerCase().includes(normalizedQuery),
    ),
  );
}

export function formatIntakeUploaderSubtitle(input: {
  customerDisplayName: string;
  customerUsername?: string | null;
  technicalStatus: string;
}): string {
  const username = input.customerUsername?.trim();
  if (username) {
    return `${input.customerDisplayName} (@${username}) · ${input.technicalStatus}`;
  }
  return `${input.customerDisplayName} · ${input.technicalStatus}`;
}
