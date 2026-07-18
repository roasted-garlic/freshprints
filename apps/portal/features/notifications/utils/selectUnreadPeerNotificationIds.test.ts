import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PortalCustomerNotification } from '../services/customerNotificationsService';
import { selectUnreadPeerNotificationIds } from './selectUnreadPeerNotificationIds';

function note(
  partial: Pick<PortalCustomerNotification, 'id' | 'requestId' | 'kind' | 'readAt'>,
): PortalCustomerNotification {
  return {
    customerId: 'c1',
    customerUid: 'u1',
    title: 'New message',
    body: 'hi',
    href: '/custom-designs?flow=assisted&step=status&detailTab=messages',
    createdAt: null,
    ...partial,
  };
}

describe('selectUnreadPeerNotificationIds', () => {
  it('includes clicked id and unread peers with same requestId + kind', () => {
    const items = [
      note({ id: 'a', requestId: 'r1', kind: 'assisted_staff_message', readAt: null }),
      note({ id: 'b', requestId: 'r1', kind: 'assisted_staff_message', readAt: null }),
      note({ id: 'c', requestId: 'r1', kind: 'assisted_proof_ready', readAt: null }),
      note({ id: 'd', requestId: 'r2', kind: 'assisted_staff_message', readAt: null }),
      note({
        id: 'e',
        requestId: 'r1',
        kind: 'assisted_staff_message',
        readAt: new Date('2026-01-01'),
      }),
    ];

    const ids = selectUnreadPeerNotificationIds(items, {
      id: 'a',
      requestId: 'r1',
      kind: 'assisted_staff_message',
    });

    assert.deepEqual(ids.sort(), ['a', 'b']);
  });

  it('always includes clicked id even when absent from items', () => {
    const ids = selectUnreadPeerNotificationIds([], {
      id: 'missing',
      requestId: 'r1',
      kind: 'assisted_proof_ready',
    });
    assert.deepEqual(ids, ['missing']);
  });
});
