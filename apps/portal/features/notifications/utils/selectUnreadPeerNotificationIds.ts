import type { CustomerNotificationKind } from '@fresh-prints/shared/types/customerNotifications/customerNotifications.types';

import type { PortalCustomerNotification } from '../services/customerNotificationsService';

/**
 * Unread notification ids that share the same assisted request + kind/surface
 * (messages vs proofs). Used when opening one alert should clear the batch.
 */
export function selectUnreadPeerNotificationIds(
  items: readonly PortalCustomerNotification[],
  target: {
    id: string;
    requestId: string;
    kind: CustomerNotificationKind;
  },
): string[] {
  const ids = new Set<string>();
  ids.add(target.id);
  for (const item of items) {
    if (item.readAt) {
      continue;
    }
    if (item.requestId !== target.requestId || item.kind !== target.kind) {
      continue;
    }
    ids.add(item.id);
  }
  return [...ids];
}
