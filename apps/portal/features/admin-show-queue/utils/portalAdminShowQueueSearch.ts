import type { PortalAdminShowRequestSummary } from '@fresh-prints/shared/types/portal/getPortalAdminUpcomingShowQueueDashboard.types';

export interface PortalAdminShowQueueRequestGroup {
  customerGroupKey: string;
  label: string;
  requests: PortalAdminShowRequestSummary[];
  requestCount: number;
  totalQuantity: number;
  /** Sum of request totals; null when any member is unpriceable/missing. */
  totalPriceUsd: number | null;
}

function normalized(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase() ?? '';
}

function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Group like Studio Print Requests: same visible customer identity shares one section.
 * Prefer the display-safe label, then the response-scoped server key, then kind/request
 * fallbacks so blank keys never split one customer across multiple headers.
 */
export function resolvePortalAdminShowQueueGroupKey(
  request: Pick<
    PortalAdminShowRequestSummary,
    'customerGroupKey' | 'printRequestId' | 'customerIdentityLabel' | 'kind'
  >,
): string {
  const label = normalized(request.customerIdentityLabel);
  if (label) {
    return `label:${label}`;
  }
  const key = request.customerGroupKey?.trim();
  if (key) {
    return key;
  }
  if (request.kind === 'internal') {
    return 'kind:internal';
  }
  return `request:${request.printRequestId}`;
}

function requestMatchesText(request: PortalAdminShowRequestSummary, query: string): boolean {
  // Request title + customer identity only — never printRequestId.
  return [request.name, request.customerIdentityLabel].some((value) =>
    normalized(value).includes(query),
  );
}

function requestMatchesCustomerIdentity(
  request: PortalAdminShowRequestSummary,
  query: string,
): boolean {
  return normalized(request.customerIdentityLabel).includes(query);
}

/**
 * Search request title and display-safe customer identity. A customer-identity
 * match expands to every request in that customer group.
 */
export function filterPortalAdminShowQueueRequests(
  requests: readonly PortalAdminShowRequestSummary[],
  rawQuery: string,
): PortalAdminShowRequestSummary[] {
  const query = normalized(rawQuery);
  if (!query) {
    return [...requests];
  }

  const matchingCustomerGroupKeys = new Set(
    requests
      .filter((request) => requestMatchesCustomerIdentity(request, query))
      .map((request) => resolvePortalAdminShowQueueGroupKey(request)),
  );

  return requests.filter((request) => {
    const groupKey = resolvePortalAdminShowQueueGroupKey(request);
    return matchingCustomerGroupKeys.has(groupKey) || requestMatchesText(request, query);
  });
}

export function groupPortalAdminShowQueueRequests(
  requests: readonly PortalAdminShowRequestSummary[],
): PortalAdminShowQueueRequestGroup[] {
  const groups = new Map<string, PortalAdminShowQueueRequestGroup>();
  for (const request of requests) {
    const customerGroupKey = resolvePortalAdminShowQueueGroupKey(request);
    const existing = groups.get(customerGroupKey);
    if (existing) {
      existing.requests.push(request);
      existing.requestCount += 1;
      existing.totalQuantity += request.printQty;
      if (existing.totalPriceUsd !== null) {
        const amount = request.requestTotalPriceUsd;
        if (typeof amount !== 'number' || !Number.isFinite(amount)) {
          existing.totalPriceUsd = null;
        } else {
          existing.totalPriceUsd = roundUsd(existing.totalPriceUsd + amount);
        }
      }
      continue;
    }

    const amount = request.requestTotalPriceUsd;
    groups.set(customerGroupKey, {
      customerGroupKey,
      label:
        request.customerIdentityLabel?.trim() ||
        (request.kind === 'internal' ? 'Internal' : 'Customer'),
      requests: [request],
      requestCount: 1,
      totalQuantity: request.printQty,
      totalPriceUsd:
        typeof amount === 'number' && Number.isFinite(amount) ? roundUsd(amount) : null,
    });
  }

  return [...groups.values()].sort((left, right) => {
    const labelOrder = normalized(left.label).localeCompare(normalized(right.label));
    if (labelOrder !== 0) {
      return labelOrder;
    }
    return left.requests[0]!.printRequestId.localeCompare(right.requests[0]!.printRequestId);
  });
}

/**
 * Sum selected-show allocation totals for the show summary. Any missing/non-finite
 * per-request total makes the show total explicitly unpriceable (not NaN/zero).
 */
export function sumPortalAdminShowAllocationTotalPriceUsd(
  requests: readonly PortalAdminShowRequestSummary[],
): number | null {
  if (requests.length === 0) {
    return null;
  }

  let total = 0;
  for (const request of requests) {
    const amount = request.selectedShowAllocationTotalPriceUsd;
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      return null;
    }
    total += amount;
  }
  return roundUsd(total);
}
