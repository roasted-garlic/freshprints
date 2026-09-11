'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { CustomerNotificationKind } from '@fresh-prints/shared/types/customerNotifications/customerNotifications.types';

import { AccountNotificationsModal } from '../../account/components/AccountNotificationsModal';
import { useAuth } from '../../auth/context/AuthContext';
import {
  customerNotificationsService,
  type PortalCustomerNotification,
} from '../services/customerNotificationsService';
import {
  isPortalBrowserPushEnabled,
  startPortalForegroundPushListener,
  subscribePortalForegroundInboxRefresh,
  syncPortalBrowserPushTokenIfGranted,
} from '../services/portalWebPushService';
import { locationMatchesNotificationHref } from '../utils/locationMatchesNotificationHref';
import { selectUnreadPeerNotificationIds } from '../utils/selectUnreadPeerNotificationIds';

interface PendingMarkRead {
  id: string;
  href: string;
  requestId: string;
  kind: CustomerNotificationKind;
}

interface PortalNotificationsContextValue {
  /**
   * Whether this browser already has permission + an active push subscription.
   * `null` until the first client check completes (do not show enable CTA while unknown).
   */
  isBrowserPushEnabled: boolean | null;
  closeHistory: () => void;
  closeNotificationSettings: () => void;
  closePanel: () => void;
  error: string | null;
  isHistoryOpen: boolean;
  isNotificationSettingsOpen: boolean;
  isPanelOpen: boolean;
  items: PortalCustomerNotification[];
  /** Mark every currently loaded unread alert as read, then close the Alerts panel. */
  markAllRead: () => void;
  openHistory: () => void;
  openItem: (item: PortalCustomerNotification) => void;
  /**
   * Opens notification preferences. Pass `onBack` when nested under Account settings
   * so the modal can return to the settings selections menu.
   */
  openNotificationSettings: (options?: { onBack?: () => void }) => void;
  /** Cleared alerts for the history modal (`readAt != null`). */
  readItems: PortalCustomerNotification[];
  refreshBrowserPushEnabled: () => void;
  retry: () => void;
  togglePanel: () => void;
  unreadCount: number;
  /** New alerts for the live dropdown (`readAt == null`). */
  unreadItems: PortalCustomerNotification[];
}

const PortalNotificationsContext = createContext<PortalNotificationsContextValue | null>(null);

function sameNotificationInbox(
  current: PortalCustomerNotification[],
  next: PortalCustomerNotification[],
): boolean {
  if (current.length !== next.length) {
    return false;
  }
  return current.every((item, index) => {
    const other = next[index];
    return (
      other != null &&
      item.id === other.id &&
      item.readAt?.getTime() === other.readAt?.getTime()
    );
  });
}

export function usePortalNotifications(): PortalNotificationsContextValue {
  const value = useContext(PortalNotificationsContext);
  if (!value) {
    throw new Error('usePortalNotifications must be used within PortalNotificationsProvider');
  }
  return value;
}

export function usePortalNotificationsOptional(): PortalNotificationsContextValue | null {
  return useContext(PortalNotificationsContext);
}

export function PortalNotificationsProvider({ children }: { children: ReactNode }) {
  const { firebaseUser, user, customer } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<PortalCustomerNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  /** Reopen Account settings when Notifications was opened from the settings hub. */
  const notificationSettingsOnBackRef = useRef<(() => void) | null>(null);
  const [hasNotificationSettingsBack, setHasNotificationSettingsBack] = useState(false);
  const [isBrowserPushEnabled, setIsBrowserPushEnabled] = useState<boolean | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [pushStatusNonce, setPushStatusNonce] = useState(0);
  /** Unread alert id queued until destination URL matches after navigate. */
  const [pendingMarkRead, setPendingMarkRead] = useState<PendingMarkRead | null>(null);
  const flushedMarkReadIdsRef = useRef(new Set<string>());
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const errorRef = useRef(error);
  errorRef.current = error;

  // Prefer Auth UID — must match customerNotifications.customerUid written by Functions.
  const customerUid = firebaseUser?.uid ?? user?.id ?? null;

  const applyItems = useCallback((next: PortalCustomerNotification[]) => {
    setItems((current) => (sameNotificationInbox(current, next) ? current : next));
    setError(null);
  }, []);

  const refreshInboxFromServer = useCallback(() => {
    if (!customerUid || !customer?.id) {
      return;
    }
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }
    const request = customerNotificationsService
      .listRecent(customerUid)
      .then((next) => {
        applyItems(next);
      })
      .catch((refreshError: unknown) => {
        console.error('[portalNotifications] listRecent failed', refreshError);
      })
      .finally(() => {
        refreshInFlightRef.current = null;
      });
    refreshInFlightRef.current = request;
    return request;
  }, [applyItems, customer?.id, customerUid]);

  useEffect(() => {
    if (!customerUid || !customer?.id) {
      setItems([]);
      setError(null);
      return;
    }

    return customerNotificationsService.subscribeRecent(
      customerUid,
      (next) => {
        applyItems(next);
      },
      (message) => {
        console.error('[portalNotifications] subscribeRecent failed', message);
        setError(message);
      },
    );
  }, [applyItems, customer?.id, customerUid, retryNonce]);

  useEffect(() => {
    startPortalForegroundPushListener();
    return subscribePortalForegroundInboxRefresh(() => {
      void refreshInboxFromServer();
    });
  }, [refreshInboxFromServer]);

  useEffect(() => {
    if (!customerUid || !customer?.id) {
      return;
    }
    const refreshIfVisible = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      if (errorRef.current) {
        setRetryNonce((value) => value + 1);
      }
      void refreshInboxFromServer();
    };
    const reattachListener = () => {
      setRetryNonce((value) => value + 1);
      void refreshInboxFromServer();
    };
    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('online', reattachListener);
    return () => {
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('online', reattachListener);
    };
  }, [customer?.id, customerUid, refreshInboxFromServer]);

  useEffect(() => {
    if (!customer?.id) {
      setIsBrowserPushEnabled(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      // Heal server-disabled / UNREGISTERED tokens once per tab session.
      await syncPortalBrowserPushTokenIfGranted();
      if (cancelled) {
        return;
      }
      startPortalForegroundPushListener();
      const enabled = await isPortalBrowserPushEnabled();
      if (!cancelled) {
        setIsBrowserPushEnabled(enabled);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customer?.id, pushStatusNonce]);

  useEffect(() => {
    if (!customer?.id) {
      return;
    }
    // Re-check enabled when opening Alerts/settings without forcing another token rotate.
    let cancelled = false;
    void isPortalBrowserPushEnabled().then((enabled) => {
      if (!cancelled) {
        setIsBrowserPushEnabled(enabled);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [customer?.id, isPanelOpen, isNotificationSettingsOpen]);

  const unreadItems = useMemo(() => items.filter((item) => !item.readAt), [items]);
  const readItems = useMemo(() => items.filter((item) => item.readAt != null), [items]);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);
  const closeHistory = useCallback(() => setIsHistoryOpen(false), []);
  const closeNotificationSettings = useCallback(() => {
    notificationSettingsOnBackRef.current = null;
    setHasNotificationSettingsBack(false);
    setIsNotificationSettingsOpen(false);
  }, []);
  const openNotificationSettings = useCallback((options?: { onBack?: () => void }) => {
    setIsPanelOpen(false);
    setIsHistoryOpen(false);
    notificationSettingsOnBackRef.current = options?.onBack ?? null;
    setHasNotificationSettingsBack(Boolean(options?.onBack));
    setIsNotificationSettingsOpen(true);
  }, []);
  const handleNotificationSettingsBack = useCallback(() => {
    const onBack = notificationSettingsOnBackRef.current;
    notificationSettingsOnBackRef.current = null;
    setHasNotificationSettingsBack(false);
    setIsNotificationSettingsOpen(false);
    onBack?.();
  }, []);
  const openHistory = useCallback(() => {
    setIsPanelOpen(false);
    setIsHistoryOpen(true);
  }, []);
  const refreshBrowserPushEnabled = useCallback(() => {
    setPushStatusNonce((value) => value + 1);
  }, []);
  const retry = useCallback(() => setRetryNonce((value) => value + 1), []);
  const togglePanel = useCallback(() => {
    if (!isPanelOpen && error) {
      retry();
    }
    setIsPanelOpen((open) => !open);
  }, [error, isPanelOpen, retry]);

  const openItem = useCallback(
    (item: PortalCustomerNotification) => {
      // Navigate first; mark-read only after destination URL matches (see effect below).
      // Closing the panel unmounts the pinned unread list so it cannot flash empty mid-click.
      closePanel();
      closeHistory();
      if (!item.readAt) {
        setPendingMarkRead({
          id: item.id,
          href: item.href,
          requestId: item.requestId,
          kind: item.kind,
        });
      } else {
        setPendingMarkRead(null);
      }
      router.push(item.href);
    },
    [closeHistory, closePanel, router],
  );

  const markAllRead = useCallback(() => {
    const ids = unreadItems
      .map((item) => item.id)
      .filter((id) => !flushedMarkReadIdsRef.current.has(id));
    if (ids.length === 0) {
      closePanel();
      return;
    }
    for (const id of ids) {
      flushedMarkReadIdsRef.current.add(id);
    }
    closePanel();
    void customerNotificationsService.markReadMany(ids).catch((markError: unknown) => {
      for (const id of ids) {
        flushedMarkReadIdsRef.current.delete(id);
      }
      console.error('[portalNotifications] markAllRead failed', markError);
    });
  }, [closePanel, unreadItems]);

  useEffect(() => {
    if (!pendingMarkRead) {
      return;
    }
    if (!locationMatchesNotificationHref(pathname, searchParams, pendingMarkRead.href)) {
      return;
    }
    const peerIds = selectUnreadPeerNotificationIds(items, pendingMarkRead).filter(
      (id) => !flushedMarkReadIdsRef.current.has(id),
    );
    if (peerIds.length === 0) {
      setPendingMarkRead(null);
      return;
    }
    for (const id of peerIds) {
      flushedMarkReadIdsRef.current.add(id);
    }
    setPendingMarkRead(null);
    void customerNotificationsService.markReadMany(peerIds).catch((markError: unknown) => {
      for (const id of peerIds) {
        flushedMarkReadIdsRef.current.delete(id);
      }
      console.error('[portalNotifications] markReadMany failed', markError);
    });
  }, [pendingMarkRead, pathname, searchParams, items]);

  const value = useMemo(
    () => ({
      isBrowserPushEnabled,
      closeHistory,
      closeNotificationSettings,
      closePanel,
      error,
      isHistoryOpen,
      isNotificationSettingsOpen,
      isPanelOpen,
      items,
      markAllRead,
      openHistory,
      openItem,
      openNotificationSettings,
      readItems,
      refreshBrowserPushEnabled,
      retry,
      togglePanel,
      unreadCount: unreadItems.length,
      unreadItems,
    }),
    [
      isBrowserPushEnabled,
      closeHistory,
      closeNotificationSettings,
      closePanel,
      error,
      isHistoryOpen,
      isNotificationSettingsOpen,
      isPanelOpen,
      items,
      markAllRead,
      openHistory,
      openItem,
      openNotificationSettings,
      readItems,
      refreshBrowserPushEnabled,
      retry,
      togglePanel,
      unreadItems,
    ],
  );

  return (
    <PortalNotificationsContext.Provider value={value}>
      {children}
      <AccountNotificationsModal
        isOpen={isNotificationSettingsOpen}
        onBack={hasNotificationSettingsBack ? handleNotificationSettingsBack : undefined}
        onBrowserPushEnabled={refreshBrowserPushEnabled}
        onClose={closeNotificationSettings}
      />
    </PortalNotificationsContext.Provider>
  );
}
