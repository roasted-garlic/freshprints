/**
 * Client-side Print Requests rail search (Studio).
 * Matches request id/name and customer identity fields.
 */
export function normalizePrintRequestListSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export interface PrintRequestListSearchable {
  id: string;
  name: string;
  customerId?: string | null;
  customerUsernameSnapshot?: string | null;
  customerDisplayNameSnapshot?: string | null;
  notes?: string | null;
  isInternal?: boolean;
}

export interface PrintRequestListSearchCustomer {
  id: string;
  displayName?: string | null;
  username?: string | null;
}

function getCustomerSearchHaystacks(
  request: PrintRequestListSearchable,
  customersById: ReadonlyMap<string, PrintRequestListSearchCustomer>,
): string[] {
  const haystacks: string[] = [
    request.customerId ?? "",
    request.customerUsernameSnapshot ?? "",
    request.customerDisplayNameSnapshot ?? "",
  ];

  if (request.customerId) {
    const customer = customersById.get(request.customerId);
    if (customer) {
      haystacks.push(customer.displayName ?? "", customer.username ?? "");
    }
  }

  return haystacks;
}

export function printRequestMatchesCustomerListSearch(
  request: PrintRequestListSearchable,
  normalizedQuery: string,
  customersById: ReadonlyMap<string, PrintRequestListSearchCustomer>,
): boolean {
  if (!normalizedQuery) {
    return true;
  }

  return getCustomerSearchHaystacks(request, customersById).some((value) =>
    value.toLowerCase().includes(normalizedQuery),
  );
}

export function printRequestMatchesListSearch(
  request: PrintRequestListSearchable,
  normalizedQuery: string,
  customersById: ReadonlyMap<string, PrintRequestListSearchCustomer>,
): boolean {
  if (!normalizedQuery) {
    return true;
  }

  const haystacks: string[] = [
    request.id,
    request.name,
    request.notes ?? "",
    ...getCustomerSearchHaystacks(request, customersById),
  ];

  return haystacks.some((value) => value.toLowerCase().includes(normalizedQuery));
}

export function filterPrintRequestsByListSearch<T extends PrintRequestListSearchable>(
  requests: readonly T[],
  query: string,
  customersById: ReadonlyMap<string, PrintRequestListSearchCustomer>,
): T[] {
  const normalizedQuery = normalizePrintRequestListSearchQuery(query);
  if (!normalizedQuery) {
    return [...requests];
  }

  return requests.filter((request) =>
    printRequestMatchesListSearch(request, normalizedQuery, customersById),
  );
}
