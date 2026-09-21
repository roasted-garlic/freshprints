import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PortalAdminShowRequestSummary } from '@fresh-prints/shared/types/portal/getPortalAdminUpcomingShowQueueDashboard.types';

import {
  filterPortalAdminShowQueueRequests,
  groupPortalAdminShowQueueRequests,
  resolvePortalAdminShowQueueGroupKey,
  sumPortalAdminShowAllocationTotalPriceUsd,
} from './portalAdminShowQueueSearch';

function request(overrides: Partial<PortalAdminShowRequestSummary>): PortalAdminShowRequestSummary {
  return {
    printRequestId: 'pr-1',
    name: 'Request One',
    kind: 'customer',
    customerGroupKey: 'cg-a',
    customerIdentityLabel: 'Ada Customer',
    designQty: 1,
    printQty: 2,
    statusSummary: '2 queued',
    requestTotalPriceUsd: 4,
    selectedShowAllocationTotalPriceUsd: 4,
    ...overrides,
  };
}

describe('portal admin Show Queue search and grouping', () => {
  const requests = [
    request({ printRequestId: 'pr-a1', name: 'First Title', customerGroupKey: 'cg-a' }),
    request({ printRequestId: 'pr-a2', name: 'Second Title', customerGroupKey: 'cg-a' }),
    request({
      printRequestId: 'pr-b1',
      name: 'Other Title',
      customerGroupKey: 'cg-b',
      customerIdentityLabel: 'Bob Customer',
    }),
  ];

  it('matches request title without matching request IDs', () => {
    assert.deepEqual(
      filterPortalAdminShowQueueRequests(requests, 'pr-b1').map((item) => item.printRequestId),
      [],
    );
    assert.deepEqual(
      filterPortalAdminShowQueueRequests(requests, 'second').map((item) => item.printRequestId),
      ['pr-a2'],
    );
    assert.deepEqual(
      filterPortalAdminShowQueueRequests(requests, 'title').map((item) => item.printRequestId),
      ['pr-a1', 'pr-a2', 'pr-b1'],
    );
  });

  it('returns the full customer group for a partial customer-identity match', () => {
    assert.deepEqual(
      filterPortalAdminShowQueueRequests(requests, 'ada').map((item) => item.printRequestId),
      ['pr-a1', 'pr-a2'],
    );
    assert.deepEqual(
      filterPortalAdminShowQueueRequests(requests, 'bob').map((item) => item.printRequestId),
      ['pr-b1'],
    );
  });

  it('groups the same customer identity into one section even when server keys differ', () => {
    const splitKeyRequests = [
      request({
        printRequestId: 'pr-a1',
        name: 'First',
        customerGroupKey: 'cg-1',
        printQty: 10,
        requestTotalPriceUsd: 20,
      }),
      request({
        printRequestId: 'pr-a2',
        name: 'Second',
        customerGroupKey: 'cg-2',
        printQty: 6,
        requestTotalPriceUsd: 12,
      }),
      request({
        printRequestId: 'pr-b1',
        name: 'Other',
        customerGroupKey: 'cg-3',
        customerIdentityLabel: 'Bob Customer',
        printQty: 1,
        requestTotalPriceUsd: 3,
      }),
    ];
    const groups = groupPortalAdminShowQueueRequests(splitKeyRequests);
    assert.deepEqual(
      groups.map((group) => ({
        label: group.label,
        ids: group.requests.map((item) => item.printRequestId),
        requestCount: group.requestCount,
        totalQuantity: group.totalQuantity,
        totalPriceUsd: group.totalPriceUsd,
      })),
      [
        {
          label: 'Ada Customer',
          ids: ['pr-a1', 'pr-a2'],
          requestCount: 2,
          totalQuantity: 16,
          totalPriceUsd: 32,
        },
        {
          label: 'Bob Customer',
          ids: ['pr-b1'],
          requestCount: 1,
          totalQuantity: 1,
          totalPriceUsd: 3,
        },
      ],
    );
  });

  it('clears to all rows and keeps different customers independent', () => {
    assert.equal(filterPortalAdminShowQueueRequests(requests, '   ').length, 3);
    const groups = groupPortalAdminShowQueueRequests(requests);
    assert.deepEqual(groups.map((group) => group.requests.map((item) => item.printRequestId)), [
      ['pr-a1', 'pr-a2'],
      ['pr-b1'],
    ]);
  });

  it('groups blank server keys by customer label instead of splitting per request', () => {
    const legacyRequests = [
      request({
        printRequestId: 'pr-a1',
        name: 'First',
        customerGroupKey: '',
        customerIdentityLabel: 'Ada Customer',
      }),
      request({
        printRequestId: 'pr-a2',
        name: 'Second',
        customerGroupKey: '   ',
        customerIdentityLabel: 'Ada Customer',
      }),
      request({
        printRequestId: 'pr-b1',
        name: 'Other',
        customerGroupKey: undefined as unknown as string,
        customerIdentityLabel: 'Bob Customer',
      }),
    ];

    assert.deepEqual(
      filterPortalAdminShowQueueRequests(legacyRequests, 'ada').map((item) => item.printRequestId),
      ['pr-a1', 'pr-a2'],
    );
    assert.deepEqual(
      filterPortalAdminShowQueueRequests(legacyRequests, 'other').map((item) => item.printRequestId),
      ['pr-b1'],
    );

    const groups = groupPortalAdminShowQueueRequests(legacyRequests);
    assert.deepEqual(
      groups.map((group) => group.customerGroupKey),
      ['label:ada customer', 'label:bob customer'],
    );
  });

  it('resolves group keys from label first, then server key', () => {
    assert.equal(
      resolvePortalAdminShowQueueGroupKey({
        customerGroupKey: 'cg-live',
        printRequestId: 'pr-9',
        customerIdentityLabel: 'Ada Customer',
        kind: 'customer',
      }),
      'label:ada customer',
    );
    assert.equal(
      resolvePortalAdminShowQueueGroupKey({
        customerGroupKey: 'cg-live',
        printRequestId: 'pr-9',
        kind: 'customer',
      }),
      'cg-live',
    );
    assert.equal(
      resolvePortalAdminShowQueueGroupKey({
        customerGroupKey: '',
        printRequestId: 'pr-9',
        kind: 'internal',
      }),
      'kind:internal',
    );
  });

  it('sums show allocation totals and treats missing/non-finite as unpriceable', () => {
    assert.equal(sumPortalAdminShowAllocationTotalPriceUsd(requests), 12);
    assert.equal(
      sumPortalAdminShowAllocationTotalPriceUsd([
        request({ selectedShowAllocationTotalPriceUsd: 1.005 }),
        request({ printRequestId: 'pr-2', selectedShowAllocationTotalPriceUsd: 2.005 }),
      ]),
      3.01,
    );
    assert.equal(
      sumPortalAdminShowAllocationTotalPriceUsd([
        request({ selectedShowAllocationTotalPriceUsd: null }),
        request({ printRequestId: 'pr-2', selectedShowAllocationTotalPriceUsd: 2 }),
      ]),
      null,
    );
    assert.equal(
      sumPortalAdminShowAllocationTotalPriceUsd([
        request({ selectedShowAllocationTotalPriceUsd: Number.NaN }),
      ]),
      null,
    );
  });
});
