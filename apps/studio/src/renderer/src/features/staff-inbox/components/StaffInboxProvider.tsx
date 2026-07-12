import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import {
  deriveStaffInboxBadgeCounts,
  deriveStaffInboxItems,
  listQueuedGroupKeys,
} from "@fresh-prints/shared/staffInbox/deriveStaffInboxItems";
import { buildStaffInboxAlertToastCopy } from "@fresh-prints/shared/staffInbox/staffInboxAlertToastCopy";
import { compareStaffInboxAlertSoundKinds } from "@fresh-prints/shared/staffInbox/staffInboxAlertOrdering";
import { listFullPortalShowIds } from "@fresh-prints/shared/staffInbox/staffInboxShowSnapshots";
import type { StaffInboxCompletedItem, StaffInboxItem } from "@fresh-prints/shared/staffInbox/staffInbox.types";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { StaffInboxContext, type StaffInboxToast } from "../context/staffInboxContext";
import type { StaffInboxSubscriptionSnapshot } from "../services/staffInboxSubscriptionService";
import type { StaffInboxShowSnapshot } from "@fresh-prints/shared/staffInbox/staffInboxShowSnapshots";
import type { StaffInboxAckRecord } from "../services/staffInboxAckLegacyLocalStore";
import {
  mapAckRecordsToCompletedItems,
  staffInboxAckService,
} from "../services/staffInboxAckService";
import { staffInboxAlertDeliveryService } from "../services/staffInboxAlertDeliveryService";
import { loadStaffInboxAlertSettings } from "../services/staffInboxAlertSettingsStore";
import { enqueueStaffInboxAlertSound } from "../services/staffInboxAlertSoundService";
import { staffInboxSubscriptionService } from "../services/staffInboxSubscriptionService";
import { formatStaffInboxFirestoreError } from "../utils/formatStaffInboxFirestoreError";
import { getStaffInboxItemNavigationPath } from "../utils/staffInboxNavigation";

const HIGHLIGHT_DURATION_MS = 8_000;
const ALERT_BATCH_WINDOW_MS = 150;

const EMPTY_SUBSCRIPTION_SNAPSHOT: StaffInboxSubscriptionSnapshot = {
  portalRequests: [],
  portalAllocations: [],
  shows: [],
};

interface StaffInboxProviderProps {
  children: ReactNode;
}

type PendingStaffInboxAlert = Omit<StaffInboxToast, "id"> & {
  itemId: string;
  itemKind: "portal_queued" | "show_queue_full";
  occurredAtMillis: number;
};

function buildInboxErrorMessage(requestError: string | null, allocationError: string | null): string | null {
  const message = requestError && allocationError ? requestError : requestError;

  return message ? formatStaffInboxFirestoreError(message) : null;
}

function buildInboxWarningMessage(
  requestError: string | null,
  allocationError: string | null,
  showError: string | null,
): string | null {
  const message =
    showError ?? (requestError && allocationError ? allocationError : allocationError);

  return message ? formatStaffInboxFirestoreError(message) : null;
}

function applyAckRecordsToState(
  records: StaffInboxAckRecord[],
  setAcknowledgedItemIds: (ids: Set<string>) => void,
  setCompletedItems: (items: StaffInboxCompletedItem[]) => void,
): void {
  setAcknowledgedItemIds(new Set(records.map((record) => record.itemId)));
  setCompletedItems(mapAckRecordsToCompletedItems(records));
}

export function StaffInboxProvider({ children }: StaffInboxProviderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEnabled = Boolean(user && permissionService.canViewPrintRequests(user));

  const [acknowledgedItemIds, setAcknowledgedItemIds] = useState<Set<string>>(() => new Set());
  const [completedItems, setCompletedItems] = useState<StaffInboxCompletedItem[]>([]);
  const [ackRecords, setAckRecords] = useState<StaffInboxAckRecord[]>([]);
  const [subscriptionSnapshot, setSubscriptionSnapshot] = useState(EMPTY_SUBSCRIPTION_SNAPSHOT);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [toasts, setToasts] = useState<StaffInboxToast[]>([]);
  const [highlightedItemIds, setHighlightedItemIds] = useState<Set<string>>(() => new Set());

  const acknowledgedItemIdsRef = useRef(acknowledgedItemIds);
  const ackRecordsRef = useRef(ackRecords);
  const showSnapshotsRef = useRef<StaffInboxShowSnapshot[]>([]);
  const showTitleByIdRef = useRef<Record<string, string>>({});
  const previousQueuedGroupKeysRef = useRef<Set<string> | null>(null);
  const previousFullShowIdsRef = useRef<Set<string> | null>(null);
  const previousOpenItemIdsRef = useRef<Set<string> | null>(null);
  const previousAckCountRef = useRef<number | null>(null);
  const acksHydratedRef = useRef(false);
  const subscriptionHydratedRef = useRef(false);
  const deliveriesHydratedRef = useRef(false);
  const soundDeliveredItemIdsRef = useRef<Set<string>>(new Set());
  const highlightTimeoutIdsRef = useRef<Map<string, number>>(new Map());
  const toastSequenceRef = useRef(0);
  const pendingAlertsRef = useRef<PendingStaffInboxAlert[]>([]);
  const alertFlushTimeoutRef = useRef<number | null>(null);
  const toastQueueRef = useRef<StaffInboxToast[]>([]);
  const activeToastIdRef = useRef<string | null>(null);
  const migrationStartedRef = useRef<string | null>(null);
  const evaluateAlertsRef = useRef<(snapshot: StaffInboxSubscriptionSnapshot) => void>(() => undefined);
  const subscriptionSnapshotRef = useRef(subscriptionSnapshot);

  useEffect(() => {
    acknowledgedItemIdsRef.current = acknowledgedItemIds;
  }, [acknowledgedItemIds]);

  useEffect(() => {
    ackRecordsRef.current = ackRecords;
  }, [ackRecords]);

  useEffect(() => {
    subscriptionSnapshotRef.current = subscriptionSnapshot;
  }, [subscriptionSnapshot]);

  const showSnapshots = useMemo(
    () => subscriptionSnapshot.shows.map((show) => show.snapshot),
    [subscriptionSnapshot.shows],
  );
  const showTitleById = useMemo(
    () =>
      Object.fromEntries(subscriptionSnapshot.shows.map((show) => [show.snapshot.id, show.title])),
    [subscriptionSnapshot.shows],
  );

  useEffect(() => {
    showSnapshotsRef.current = showSnapshots;
    showTitleByIdRef.current = showTitleById;
  }, [showSnapshots, showTitleById]);

  useEffect(() => {
    if (!user?.id || !isEnabled) {
      setAcknowledgedItemIds(new Set());
      setCompletedItems([]);
      setAckRecords([]);
      previousAckCountRef.current = null;
      acksHydratedRef.current = false;
      migrationStartedRef.current = null;
      return;
    }

    if (migrationStartedRef.current !== user.id) {
      migrationStartedRef.current = user.id;
      void staffInboxAckService.migrateLegacyLocalStorage(user.id).catch(() => {
        // Subscription still works; legacy rows may retry on next session.
      });
    }

    const unsubscribe = staffInboxAckService.subscribe(
      user.id,
      (records) => {
        const previousCount = previousAckCountRef.current;
        previousAckCountRef.current = records.length;
        const wasHydrated = acksHydratedRef.current;
        acksHydratedRef.current = true;

        // Wipe (or full clear) → re-baseline on next evaluate (do not treat existing rows as new).
        if (previousCount !== null && previousCount > 0 && records.length === 0) {
          previousQueuedGroupKeysRef.current = null;
          previousFullShowIdsRef.current = null;
        }

        // Keep the ref in sync before any immediate evaluateAlerts call.
        const nextAckIds = new Set(records.map((record) => record.itemId));
        acknowledgedItemIdsRef.current = nextAckIds;
        setAckRecords(records);
        applyAckRecordsToState(records, setAcknowledgedItemIds, setCompletedItems);

        if (!wasHydrated || (previousCount !== null && previousCount > 0 && records.length === 0)) {
          evaluateAlertsRef.current(subscriptionSnapshotRef.current);
        }
      },
      (message) => {
        setWarning(formatStaffInboxFirestoreError(message));
      },
    );

    return unsubscribe;
  }, [isEnabled, user?.id]);

  useEffect(() => {
    if (!user?.id || showSnapshots.length === 0) {
      return;
    }

    const fullShowIds = new Set(
      listFullPortalShowIds(showSnapshots, subscriptionSnapshot.portalAllocations),
    );

    void staffInboxAckService
      .pruneResolvedShowQueueFull(user.id, ackRecordsRef.current, fullShowIds)
      .catch(() => {
        // Snapshot subscription remains source of truth.
      });
  }, [showSnapshots, subscriptionSnapshot.portalAllocations, user?.id]);

  const presentNextToast = useCallback(() => {
    if (activeToastIdRef.current) {
      return;
    }

    const nextToast = toastQueueRef.current.shift();

    if (!nextToast) {
      setToasts([]);
      return;
    }

    activeToastIdRef.current = nextToast.id;
    setToasts([nextToast]);
  }, []);

  const flushPendingAlerts = useCallback(() => {
    if (pendingAlertsRef.current.length === 0) {
      return;
    }

    const batch = [...pendingAlertsRef.current].sort((left, right) =>
      compareStaffInboxAlertSoundKinds(left.alertKind, right.alertKind),
    );
    pendingAlertsRef.current = [];

    const settings = user?.id ? loadStaffInboxAlertSettings(user.id) : null;
    let playedSoundForBatch = false;

    for (const alert of batch) {
      if (soundDeliveredItemIdsRef.current.has(alert.itemId)) {
        continue;
      }

      toastSequenceRef.current += 1;
      toastQueueRef.current.push({
        alertKind: alert.alertKind,
        title: alert.title,
        subtitle: alert.subtitle,
        navigationPath: alert.navigationPath,
        id: `staff-inbox-toast-${toastSequenceRef.current}`,
      });

      soundDeliveredItemIdsRef.current.add(alert.itemId);
      if (user?.id) {
        void staffInboxAlertDeliveryService
          .markSoundPlayed({
            userId: user.id,
            itemId: alert.itemId,
            kind: alert.itemKind,
            occurredAtMillis: alert.occurredAtMillis,
          })
          .catch(() => {
            // Keep in-memory mark; next session may retry persistence.
          });
      }

      if (user?.id && settings && !playedSoundForBatch) {
        enqueueStaffInboxAlertSound(user.id, settings, alert.alertKind);
        playedSoundForBatch = true;
      }
    }

    presentNextToast();
  }, [presentNextToast, user?.id]);

  const queueAlert = useCallback(
    (alert: PendingStaffInboxAlert) => {
      if (soundDeliveredItemIdsRef.current.has(alert.itemId)) {
        return;
      }

      pendingAlertsRef.current.push(alert);

      if (alertFlushTimeoutRef.current) {
        window.clearTimeout(alertFlushTimeoutRef.current);
      }

      alertFlushTimeoutRef.current = window.setTimeout(() => {
        alertFlushTimeoutRef.current = null;
        flushPendingAlerts();
      }, ALERT_BATCH_WINDOW_MS);
    },
    [flushPendingAlerts],
  );

  const evaluateAlerts = useCallback(
    (snapshot: typeof subscriptionSnapshot) => {
      // Wait for ack + delivery hydration and at least one inbox subscription emit.
      if (
        !acksHydratedRef.current ||
        !deliveriesHydratedRef.current ||
        !subscriptionHydratedRef.current
      ) {
        return;
      }

      const openItems = deriveStaffInboxItems({
        portalAllocations: snapshot.portalAllocations,
        acknowledgedItemIds: acknowledgedItemIdsRef.current,
        showTitleById: showTitleByIdRef.current,
        shows: showSnapshotsRef.current,
      });

      const nextQueuedGroupKeys = new Set(listQueuedGroupKeys(snapshot.portalAllocations));
      const previousQueuedGroupKeys = previousQueuedGroupKeysRef.current;

      if (previousQueuedGroupKeys === null) {
        previousQueuedGroupKeysRef.current = nextQueuedGroupKeys;
      } else {
        for (const groupKey of nextQueuedGroupKeys) {
          if (previousQueuedGroupKeys.has(groupKey)) {
            continue;
          }

          const queuedItem = openItems.find(
            (item) =>
              item.kind === "portal_queued" &&
              `${item.printRequestId}:${item.upcomingShowId}` === groupKey,
          );

          if (!queuedItem) {
            continue;
          }

          queueAlert({
            alertKind: "request_queued_to_show",
            itemId: queuedItem.id,
            itemKind: "portal_queued",
            occurredAtMillis: queuedItem.occurredAtMillis,
            ...buildStaffInboxAlertToastCopy("portal_queued", queuedItem.title),
            navigationPath: getStaffInboxItemNavigationPath(queuedItem),
          });
        }

        previousQueuedGroupKeysRef.current = nextQueuedGroupKeys;
      }

      if (showSnapshotsRef.current.length === 0) {
        return;
      }

      const nextFullShowIds = new Set(
        listFullPortalShowIds(showSnapshotsRef.current, snapshot.portalAllocations),
      );
      const previousFullShowIds = previousFullShowIdsRef.current;

      if (previousFullShowIds === null) {
        previousFullShowIdsRef.current = nextFullShowIds;
        return;
      }

      for (const showId of nextFullShowIds) {
        if (previousFullShowIds.has(showId)) {
          continue;
        }

        const fullItem = openItems.find(
          (item) => item.kind === "show_queue_full" && item.upcomingShowId === showId,
        );

        if (!fullItem) {
          continue;
        }

        queueAlert({
          alertKind: "show_queue_full",
          itemId: fullItem.id,
          itemKind: "show_queue_full",
          occurredAtMillis: fullItem.occurredAtMillis,
          ...buildStaffInboxAlertToastCopy("show_queue_full", fullItem.title),
          navigationPath: getStaffInboxItemNavigationPath(fullItem),
        });
      }

      previousFullShowIdsRef.current = nextFullShowIds;
    },
    [queueAlert],
  );

  evaluateAlertsRef.current = evaluateAlerts;

  useEffect(() => {
    if (!isEnabled) {
      setSubscriptionSnapshot(EMPTY_SUBSCRIPTION_SNAPSHOT);
      setError(null);
      setWarning(null);
      previousQueuedGroupKeysRef.current = null;
      previousFullShowIdsRef.current = null;
      previousOpenItemIdsRef.current = null;
      acksHydratedRef.current = false;
      subscriptionHydratedRef.current = false;
      deliveriesHydratedRef.current = false;
      soundDeliveredItemIdsRef.current = new Set();
      setHighlightedItemIds(new Set());

      for (const timeoutId of highlightTimeoutIdsRef.current.values()) {
        window.clearTimeout(timeoutId);
      }

      highlightTimeoutIdsRef.current.clear();

      if (alertFlushTimeoutRef.current) {
        window.clearTimeout(alertFlushTimeoutRef.current);
        alertFlushTimeoutRef.current = null;
      }

      pendingAlertsRef.current = [];
      toastQueueRef.current = [];
      activeToastIdRef.current = null;
      setToasts([]);
      return;
    }

    const unsubscribe = staffInboxSubscriptionService.subscribe((state) => {
      subscriptionHydratedRef.current = true;
      setSubscriptionSnapshot(state.snapshot);
      setError(buildInboxErrorMessage(state.requestError, state.allocationError));
      setWarning(buildInboxWarningMessage(state.requestError, state.allocationError, state.showError));
      evaluateAlerts(state.snapshot);
    });

    return unsubscribe;
  }, [evaluateAlerts, isEnabled]);

  useEffect(() => {
    if (!isEnabled || !user?.id) {
      deliveriesHydratedRef.current = false;
      soundDeliveredItemIdsRef.current = new Set();
      return;
    }

    const unsubscribe = staffInboxAlertDeliveryService.subscribe(
      user.id,
      (deliveries) => {
        soundDeliveredItemIdsRef.current = new Set(deliveries.map((entry) => entry.itemId));
        deliveriesHydratedRef.current = true;
        evaluateAlertsRef.current(subscriptionSnapshotRef.current);
      },
      (message) => {
        setWarning(formatStaffInboxFirestoreError(message));
        deliveriesHydratedRef.current = true;
      },
    );

    return unsubscribe;
  }, [isEnabled, user?.id]);

  useEffect(() => {
    if (!isEnabled || previousQueuedGroupKeysRef.current === null) {
      return;
    }

    evaluateAlerts(subscriptionSnapshot);
  }, [evaluateAlerts, isEnabled, showSnapshots, subscriptionSnapshot]);

  const openItems = useMemo(
    () =>
      deriveStaffInboxItems({
        portalAllocations: subscriptionSnapshot.portalAllocations,
        acknowledgedItemIds,
        showTitleById,
        shows: showSnapshots,
      }),
    [acknowledgedItemIds, showSnapshots, showTitleById, subscriptionSnapshot.portalAllocations],
  );

  const highlightItem = useCallback((itemId: string) => {
    setHighlightedItemIds((current) => {
      if (current.has(itemId)) {
        return current;
      }

      const next = new Set(current);
      next.add(itemId);
      return next;
    });

    const existingTimeoutId = highlightTimeoutIdsRef.current.get(itemId);

    if (existingTimeoutId) {
      window.clearTimeout(existingTimeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      setHighlightedItemIds((current) => {
        if (!current.has(itemId)) {
          return current;
        }

        const next = new Set(current);
        next.delete(itemId);
        return next;
      });
      highlightTimeoutIdsRef.current.delete(itemId);
    }, HIGHLIGHT_DURATION_MS);

    highlightTimeoutIdsRef.current.set(itemId, timeoutId);
  }, []);

  const clearItemHighlight = useCallback((itemId: string) => {
    const existingTimeoutId = highlightTimeoutIdsRef.current.get(itemId);

    if (existingTimeoutId) {
      window.clearTimeout(existingTimeoutId);
      highlightTimeoutIdsRef.current.delete(itemId);
    }

    setHighlightedItemIds((current) => {
      if (!current.has(itemId)) {
        return current;
      }

      const next = new Set(current);
      next.delete(itemId);
      return next;
    });
  }, []);

  useEffect(() => {
    const currentOpenItemIds = new Set(openItems.map((item) => item.id));
    const previousOpenItemIds = previousOpenItemIdsRef.current;

    if (previousOpenItemIds === null) {
      previousOpenItemIdsRef.current = currentOpenItemIds;
      return;
    }

    for (const item of openItems) {
      if (!previousOpenItemIds.has(item.id)) {
        highlightItem(item.id);
      }
    }

    previousOpenItemIdsRef.current = currentOpenItemIds;
  }, [highlightItem, openItems]);

  const isItemHighlighted = useCallback(
    (itemId: string) => highlightedItemIds.has(itemId),
    [highlightedItemIds],
  );

  const badgeCounts = useMemo(() => deriveStaffInboxBadgeCounts(openItems), [openItems]);

  const togglePanel = useCallback(() => {
    setIsPanelOpen((current) => !current);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const acknowledgeItem = useCallback(
    (item: StaffInboxItem) => {
      if (!user?.id) {
        return;
      }

      clearItemHighlight(item.id);
      setAcknowledgedItemIds((current) => {
        const next = new Set(current);
        next.add(item.id);
        return next;
      });
      setCompletedItems((current) => [
        {
          ...item,
          acknowledgedAtMillis: Date.now(),
        },
        ...current.filter((entry) => entry.id !== item.id),
      ]);

      void staffInboxAckService.acknowledge(user.id, item).catch(() => {
        setWarning("Unable to save inbox Done state. Check your connection and try again.");
      });
    },
    [clearItemHighlight, user?.id],
  );

  const restoreItem = useCallback(
    (itemId: string) => {
      if (!user?.id) {
        return;
      }

      setAcknowledgedItemIds((current) => {
        const next = new Set(current);
        next.delete(itemId);
        return next;
      });
      setCompletedItems((current) => current.filter((entry) => entry.id !== itemId));

      void staffInboxAckService.restore(user.id, itemId).catch(() => {
        setWarning("Unable to restore inbox item. Check your connection and try again.");
      });
    },
    [user?.id],
  );

  const dismissToast = useCallback(
    (toastId: string) => {
      if (activeToastIdRef.current === toastId) {
        activeToastIdRef.current = null;
      }

      setToasts([]);
      presentNextToast();
    },
    [presentNextToast],
  );

  const openItem = useCallback(
    (item: StaffInboxItem) => {
      closePanel();
      navigate(getStaffInboxItemNavigationPath(item));
    },
    [closePanel, navigate],
  );

  const contextValue = useMemo(
    () => ({
      openItems,
      completedItems,
      badgeCounts,
      toasts,
      isPanelOpen,
      isEnabled,
      error,
      warning,
      togglePanel,
      closePanel,
      acknowledgeItem,
      restoreItem,
      dismissToast,
      openItem,
      isItemHighlighted,
    }),
    [
      acknowledgeItem,
      badgeCounts,
      closePanel,
      completedItems,
      dismissToast,
      error,
      isEnabled,
      isItemHighlighted,
      isPanelOpen,
      openItem,
      openItems,
      restoreItem,
      toasts,
      togglePanel,
      warning,
    ],
  );

  useEffect(() => {
    const highlightTimeouts = highlightTimeoutIdsRef.current;

    return () => {
      for (const timeoutId of highlightTimeouts.values()) {
        window.clearTimeout(timeoutId);
      }

      highlightTimeouts.clear();

      if (alertFlushTimeoutRef.current) {
        window.clearTimeout(alertFlushTimeoutRef.current);
      }
    };
  }, []);

  return <StaffInboxContext.Provider value={contextValue}>{children}</StaffInboxContext.Provider>;
}
