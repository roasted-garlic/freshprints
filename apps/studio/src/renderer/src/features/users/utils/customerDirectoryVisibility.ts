import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";

export type CustomerDirectoryVisibilityTab = "active" | "disabled" | "closed" | "merged";

export function classifyCustomerAccountVisibility(
  customer: Customer,
): CustomerDirectoryVisibilityTab {
  if (customer.isDeleted === true) {
    return "closed";
  }

  if (
    customer.isMerged === true ||
    (typeof customer.mergedIntoCustomerId === "string" && customer.mergedIntoCustomerId.trim())
  ) {
    return "merged";
  }

  if (customer.isDisabled === true) {
    return "disabled";
  }

  return "active";
}

export function filterCustomersByVisibilityTab(
  customers: Customer[],
  tab: CustomerDirectoryVisibilityTab,
): Customer[] {
  return customers.filter((customer) => classifyCustomerAccountVisibility(customer) === tab);
}

export function countCustomersByVisibilityTab(customers: Customer[]): Record<
  CustomerDirectoryVisibilityTab,
  number
> {
  const counts: Record<CustomerDirectoryVisibilityTab, number> = {
    active: 0,
    disabled: 0,
    closed: 0,
    merged: 0,
  };

  for (const customer of customers) {
    counts[classifyCustomerAccountVisibility(customer)] += 1;
  }

  return counts;
}

/** Active directory account — eligible for new print request assignment pickers. */
export function isActiveCustomerAccount(customer: Customer): boolean {
  return classifyCustomerAccountVisibility(customer) === "active";
}

export function isReversibleDisabledCustomer(customer: Customer): boolean {
  return (
    customer.isDisabled === true &&
    customer.isDeleted !== true &&
    customer.isMerged !== true
  );
}
