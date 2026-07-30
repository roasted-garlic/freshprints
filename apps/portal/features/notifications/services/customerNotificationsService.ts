'use client';

import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';

import { CUSTOMER_NOTIFICATIONS_COLLECTION } from '@fresh-prints/shared/types/customerNotifications/customerNotifications.types';
import type { CustomerNotificationKind } from '@fresh-prints/shared/types/customerNotifications/customerNotifications.types';
import { isCustomerNotificationKind } from '@fresh-prints/shared/types/customerNotifications/customerNotifications.types';
import {
  runTracedWrite,
  traceFirestoreListenerAttach,
  traceFirestoreListenerEmission,
  traceWrappedUnsubscribe,
} from '@fresh-prints/shared/utils/firestoreUsageTrace';

import { getPortalDb } from '../../../lib/firebase/client';
import { callTracedFunction } from '../../../lib/firebase/tracedCallable';

/** Newest-first cap for live Alerts + notification history modal. */
export const CUSTOMER_NOTIFICATIONS_QUERY_LIMIT = 50;
const NOTIFICATIONS_TRACE = {
  app: 'portal' as const,
  collection: CUSTOMER_NOTIFICATIONS_COLLECTION,
  constraints: ['customerUid==currentUser'],
  limit: CUSTOMER_NOTIFICATIONS_QUERY_LIMIT,
  orderBy: ['createdAt desc'],
  source: 'customerNotificationsService.subscribeRecent',
  triggerReason: 'authentication' as const,
};

export interface PortalCustomerNotification {
  id: string;
  customerId: string;
  customerUid: string;
  kind: CustomerNotificationKind;
  title: string;
  body: string;
  href: string;
  requestId: string;
  proofId?: string;
  createdAt: Date | null;
  readAt: Date | null;
}

function asDate(value: unknown): Date | null {
  if (value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate();
  }
  return null;
}

function mapNotification(
  id: string,
  data: Record<string, unknown>,
): PortalCustomerNotification | null {
  if (!isCustomerNotificationKind(data.kind)) {
    return null;
  }
  if (typeof data.customerId !== 'string' || typeof data.customerUid !== 'string') {
    return null;
  }
  if (typeof data.title !== 'string' || typeof data.body !== 'string' || typeof data.href !== 'string') {
    return null;
  }
  if (typeof data.requestId !== 'string') {
    return null;
  }
  return {
    id,
    customerId: data.customerId,
    customerUid: data.customerUid,
    kind: data.kind,
    title: data.title,
    body: data.body,
    href: data.href,
    requestId: data.requestId,
    proofId: typeof data.proofId === 'string' ? data.proofId : undefined,
    createdAt: asDate(data.createdAt),
    readAt: asDate(data.readAt),
  };
}

export const customerNotificationsService = {
  subscribeRecent(
    customerUid: string,
    onChange: (items: PortalCustomerNotification[]) => void,
    onError?: (message: string) => void,
  ): Unsubscribe {
    const notificationsQuery = query(
      collection(getPortalDb(), CUSTOMER_NOTIFICATIONS_COLLECTION),
      where('customerUid', '==', customerUid),
      orderBy('createdAt', 'desc'),
      limit(CUSTOMER_NOTIFICATIONS_QUERY_LIMIT),
    );

    traceFirestoreListenerAttach(NOTIFICATIONS_TRACE);
    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        traceFirestoreListenerEmission(NOTIFICATIONS_TRACE, snapshot.size);
        const items: PortalCustomerNotification[] = [];
        let skipped = 0;
        for (const document of snapshot.docs) {
          const mapped = mapNotification(document.id, document.data() as Record<string, unknown>);
          if (mapped) {
            items.push(mapped);
          } else {
            skipped += 1;
          }
        }
        if (skipped > 0) {
          console.warn(
            `[portalNotifications] skipped ${skipped} malformed customerNotifications doc(s)`,
          );
        }
        onChange(items);
      },
      (error) => {
        console.error('[portalNotifications] onSnapshot error', error);
        onError?.(error.message || 'Unable to load alerts.');
        // Keep prior items visible; clearing made failures look like "all caught up".
      },
    );
    return traceWrappedUnsubscribe(NOTIFICATIONS_TRACE, unsubscribe);
  },

  async markRead(notificationId: string): Promise<void> {
    await runTracedWrite(
      'updateDoc',
      () => updateDoc(doc(getPortalDb(), CUSTOMER_NOTIFICATIONS_COLLECTION, notificationId), {
        readAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      {
        app: 'portal',
        collection: CUSTOMER_NOTIFICATIONS_COLLECTION,
        documentPathPattern: `${CUSTOMER_NOTIFICATIONS_COLLECTION}/{notificationId}`,
        source: 'customerNotificationsService.markRead',
        triggerReason: 'explicit-refresh',
      },
    );
  },

  /** Mark many notifications read (same fields as `markRead`). No-op when empty. */
  async markReadMany(notificationIds: readonly string[]): Promise<void> {
    const uniqueIds = [...new Set(notificationIds.filter((id) => id.trim().length > 0))];
    if (uniqueIds.length === 0) {
      return;
    }
    if (uniqueIds.length === 1) {
      await this.markRead(uniqueIds[0]!);
      return;
    }
    const db = getPortalDb();
    const batch = writeBatch(db);
    const now = serverTimestamp();
    for (const notificationId of uniqueIds) {
      batch.update(doc(db, CUSTOMER_NOTIFICATIONS_COLLECTION, notificationId), {
        readAt: now,
        updatedAt: now,
      });
    }
    await runTracedWrite(
      'writeBatch',
      () => batch.commit(),
      {
        app: 'portal',
        collection: CUSTOMER_NOTIFICATIONS_COLLECTION,
        documentPathPattern: `${CUSTOMER_NOTIFICATIONS_COLLECTION}/{notificationId}`,
        source: 'customerNotificationsService.markReadMany',
        triggerReason: 'explicit-refresh',
      },
      { writeCount: uniqueIds.length },
    );
  },


  async registerWebPushToken(
    token: string,
    enabled = true,
    reason: 'user-enable' | 'session-sync' = 'user-enable',
  ): Promise<void> {
    await callTracedFunction<
      {
        token: string;
        enabled: boolean;
        userAgent?: string;
        origin?: string;
        reason: 'user-enable' | 'session-sync';
      },
      { subscriptionId: string; enabled: boolean }
    >('registerWebPushSubscription', {
      source: 'customerNotificationsService.registerWebPushToken',
    })({
      token,
      enabled,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      origin: typeof window !== 'undefined' ? window.location.origin : undefined,
      reason,
    });
  },
};
