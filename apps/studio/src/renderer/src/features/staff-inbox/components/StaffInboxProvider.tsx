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
import {
  acknowledgeStaffInboxItem,
  loadAcknowledgedStaffInboxItemIds,
  loadStaffInboxAckRecords,
  mapAckRecordsToCompletedItems,
  restoreStaffInboxItem,
} from "../services/staffInboxAckStore";
import { loadStaffInboxAlertSettings } from "../services/staffInboxAlertSettingsStore";
import { enqueueStaffInboxAlertSound } from "../services/staffInboxAlertSoundService";
import { staffInboxSubscriptionService } from "../services/staffInboxSubscriptionService";
import { formatStaffInboxFirestoreError } from "../utils/formatStaffInboxFirestoreError";
import { getStaffInboxItemNavigationPath } from "../utils/staffInboxNavigation";

const HIGHLIGHT_DURATION_MS = 8_000;
const ALERT_BATCH_WINDOW_MS = 150;

const EMPTY_SUBSCRIPTION_SNAPSHOT = {
  portalRequests: [],
  portalAllocations: [],
  shows: [],
};

interface StaffInboxProviderProps {
  children: ReactNode;
}

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

export function StaffInboxProvider({ children }: StaffInboxProviderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEnabled = Boolean(user && permissionService.canViewPrintRequests(user));

  const [acknowledgedItemIds, setAcknowledgedItemIds] = useState<Set<string>>(() => new Set());
  const [completedItems, setCompletedItems] = useState<StaffInboxCompletedItem[]>([]);
  const [subscriptionSnapshot, setSubscriptionSnapshot] = useState(EMPTY_SUBSCRIPTION_SNAPSHOT);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [toasts, setToasts] = useState<StaffInboxToast[]>([]);
  const [highlightedItemIds, setHighlightedItemIds] = useState<Set<string>>(() => new Set());

  const acknowledgedItemIdsRef = useRef(acknowledgedItemIds);
  const showSnapshotsRef = useRef(EMPTY_SUBSCRIPTION_SNAPSHOT.shows.map((show) => show.snapshot));
  const showTitleByIdRef = useRef<Record<string, string>>({});
  const previousQueuedGroupKeysRef = useRef<Set<string> | null>(null);
  const previousFullShowIdsRef = useRef<Set<string> | null>(null);
  const previousOpenItemIdsRef = useRef<Set<string> | null>(null);
  const highlightTimeoutIdsRef = useRef<Map<string, number>>(new Map());
  const toastSequenceRef = useRef(0);
  const pendingAlertsRef = useRef<Omit<StaffInboxToast, "id">[]>([]);
  const alertFlushTimeoutRef = useRef<number | null>(null);
  const toastQueueRef = useRef<StaffInboxToast[]>([]);
  const activeToastIdRef = useRef<string | null>(null);

  useEffect(() => {
    acknowledgedItemIdsRef.current = acknowledgedItemIds;
  }, [acknowledgedItemIds]);

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
    if (!user?.id) {
      setAcknowledgedItemIds(new Set());
      setCompletedItems([]);
      return;
    }

    const records = loadStaffInboxAckRecords(user.id);
    setAcknowledgedItemIds(loadAcknowledgedStaffInboxItemIds(user.id));
    setCompletedItems(mapAckRecordsToCompletedItems(records));
  }, [user?.id]);

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

    for (const alert of batch) {
      toastSequenceRef.current += 1;
      toastQueueRef.current.push({
        ...alert,
        id: `staff-inbox-toast-${toastSequenceRef.current}`,
      });

      if (user?.id && settings) {
        enqueueStaffInboxAlertSound(user.id, settings, alert.alertKind);
      }
    }

    presentNextToast();
  }, [presentNextToast, user?.id]);

  const queueAlert = useCallback(
    (alert: Omit<StaffInboxToast, "id">) => {
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
      const openItems = deriveStaffInboxItems({
        portalAllocations: snapshot.portalAllocations,
        acknowledgedItemIds: acknowledgedItemIdsRef.current,
        showTitleById: showTitleByIdRef.current,
        shows: showSnapshotsRef.current,
      });

      const nextQueuedGroupKeys = new Set(listQueuedGroupKeys(snapshot.portalAllocations));
      const previousQueuedGroupKeys = previousQueuedGroupKeysRef.current;

      if (previousQueuedGroupKeys) {
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
            ...buildStaffInboxAlertToastCopy("portal_queued", queuedItem.title),
            navigationPath: getStaffInboxItemNavigationPath(queuedItem),
          });
        }
      }

      previousQueuedGroupKeysRef.current = nextQueuedGroupKeys;

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
          ...buildStaffInboxAlertToastCopy("show_queue_full", fullItem.title),
          navigationPath: getStaffInboxItemNavigationPath(fullItem),
        });
      }

      previousFullShowIdsRef.current = nextFullShowIds;
    },
    [queueAlert],
  );

  useEffect(() => {
    if (!isEnabled) {
      setSubscriptionSnapshot(EMPTY_SUBSCRIPTION_SNAPSHOT);
      setError(null);
      setWarning(null);
      previousQueuedGroupKeysRef.current = null;
      previousFullShowIdsRef.current = null;
      previousOpenItemIdsRef.current = null;
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
      setSubscriptionSnapshot(state.snapshot);
      setError(buildInboxErrorMessage(state.requestError, state.allocationError));
      setWarning(buildInboxWarningMessage(state.requestError, state.allocationError, state.showError));
      evaluateAlerts(state.snapshot);
    });

    return unsubscribe;
  }, [evaluateAlerts, isEnabled]);

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

      const records = acknowledgeStaffInboxItem(user.id, item);
      setAcknowledgedItemIds(new Set(records.map((record) => record.itemId)));
      setCompletedItems(mapAckRecordsToCompletedItems(records));
      clearItemHighlight(item.id);
    },
    [clearItemHighlight, user?.id],
  );

  const restoreItem = useCallback(
    (itemId: string) => {
      if (!user?.id) {
        return;
      }

      const records = restoreStaffInboxItem(user.id, itemId);
      setAcknowledgedItemIds(new Set(records.map((record) => record.itemId)));
      setCompletedItems(mapAckRecordsToCompletedItems(records));
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
    return () => {
      for (const timeoutId of highlightTimeoutIdsRef.current.values()) {
        window.clearTimeout(timeoutId);
      }

      highlightTimeoutIdsRef.current.clear();

      if (alertFlushTimeoutRef.current) {
        window.clearTimeout(alertFlushTimeoutRef.current);
      }
    };
  }, []);

  return <StaffInboxContext.Provider value={contextValue}>{children}</StaffInboxContext.Provider>;
}
