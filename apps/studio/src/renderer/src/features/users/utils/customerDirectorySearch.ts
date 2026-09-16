import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

export function filterCustomers(customers: Customer[], searchQuery: string): Customer[] {
  const normalizedQuery = normalizeSearchValue(searchQuery);

  if (!normalizedQuery) {
    return customers;
  }

  return customers.filter((customer) =>
    [customer.displayName, customer.username ?? "", customer.email ?? "", customer.notes ?? ""].some((value) =>
      value.toLowerCase().includes(normalizedQuery),
    ),
  );
}

/** Customer identity-only search used by request-creation pickers. */
export function filterCustomersByIdentity(customers: Customer[], searchQuery: string): Customer[] {
  const normalizedQuery = normalizeSearchValue(searchQuery);

  if (!normalizedQuery) {
    return customers;
  }

  return customers.filter((customer) =>
    [customer.displayName, customer.username ?? "", customer.email ?? ""].some((value) =>
      value.toLowerCase().includes(normalizedQuery),
    ),
  );
}
