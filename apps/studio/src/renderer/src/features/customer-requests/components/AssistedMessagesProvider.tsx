import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  ASSISTED_MESSAGES_HISTORY_LIMIT,
  assistedCreationRevisionAtMillis,
  listReadAssistedCreationCustomerUpdates,
  listUnreadAssistedCreationCustomerUpdates,
  truncateAssistedCreationMessagePreview,
} from "@fresh-prints/shared/utils/assistedCreationHistory";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { getCustomerRequestsPath } from "../constants/customerRequestRoutes";
import {
  AssistedMessagesContext,
  type AssistedMessagesInboxItem,
} from "../context/assistedMessagesContext";
import { useAssistedCreationRequests } from "../hooks/useAssistedCreationRequests";
import { assistedCreationUpdateAckService } from "../services/assistedCreationUpdateAckService";
import type { AssistedCreationRequestListItem } from "../services/assistedCreationRequestsService";

interface AssistedMessagesProviderProps {
  children: ReactNode;
}

function buildInboxRows(
  requests: AssistedCreationRequestListItem[],
  ackByRequestId: Record<string, number>,
  mode: "unread" | "read",
): AssistedMessagesInboxItem[] {
  const rows: AssistedMessagesInboxItem[] = [];
  for (const request of requests) {
    const readThrough = ackByRequestId[request.id] ?? null;
    const entries =
      mode === "unread"
        ? listUnreadAssistedCreationCustomerUpdates(request.revisionHistory, readThrough)
        : listReadAssistedCreationCustomerUpdates(request.revisionHistory, readThrough);
    for (const entry of entries) {
      const atMillis = assistedCreationRevisionAtMillis(entry.at);
      if (atMillis == null) {
        continue;
      }
      rows.push({
        id: `${request.id}__${atMillis}`,
        requestId: request.id,
        customerLabel: request.customerDisplayName || request.customerId,
        preview: truncateAssistedCreationMessagePreview(entry.note),
        atMillis,
        statusLabel: request.statusLabel,
      });
    }
  }
  rows.sort((a, b) => b.atMillis - a.atMillis);
  return rows;
}

export function AssistedMessagesProvider({ children }: AssistedMessagesProviderProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canView = Boolean(user && permissionService.canViewDesigns(user));
  const { items, error: requestsError } = useAssistedCreationRequests();
  const [ackByRequestId, setAckByRequestId] = useState<Record<string, number>>({});
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [ackError, setAckError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !canView) {
      setAckByRequestId({});
      return;
    }
    return assistedCreationUpdateAckService.subscribe(
      user.id,
      (records) => {
        const next: Record<string, number> = {};
        for (const record of records) {
          next[record.requestId] = record.readThroughAtMillis;
        }
        setAckByRequestId(next);
        setAckError(null);
      },
      (message) => {
        setAckError(message);
      },
    );
  }, [canView, user?.id]);

  const unreadItems = useMemo(() => {
    if (!canView) {
      return [] as AssistedMessagesInboxItem[];
    }
    return buildInboxRows(items, ackByRequestId, "unread");
  }, [ackByRequestId, canView, items]);

  const readItems = useMemo(() => {
    if (!canView) {
      return [] as AssistedMessagesInboxItem[];
    }
    return buildInboxRows(items, ackByRequestId, "read").slice(0, ASSISTED_MESSAGES_HISTORY_LIMIT);
  }, [ackByRequestId, canView, items]);

  const closePanel = useCallback(() => setIsPanelOpen(false), []);
  const closeHistory = useCallback(() => setIsHistoryOpen(false), []);
  const openHistory = useCallback(() => {
    setIsPanelOpen(false);
    setIsHistoryOpen(true);
  }, []);
  const togglePanel = useCallback(() => setIsPanelOpen((open) => !open), []);

  const openItem = useCallback(
    (item: AssistedMessagesInboxItem) => {
      closePanel();
      closeHistory();
      navigate(
        getCustomerRequestsPath({
          tab: "assisted",
          requestId: item.requestId,
          detailTab: "messages",
        }),
      );
      if (!user?.id) {
        return;
      }
      void assistedCreationUpdateAckService
        .markReadThrough(
          user.id,
          item.requestId,
          item.atMillis,
          ackByRequestId[item.requestId] ?? null,
        )
        .catch((error: unknown) => {
          console.error("[assistedMessagesInbox] markReadThrough failed", error);
        });
    },
    [ackByRequestId, closeHistory, closePanel, navigate, user?.id],
  );

  const value = useMemo(
    () => ({
      closeHistory,
      closePanel,
      error: ackError ?? requestsError,
      isHistoryOpen,
      isPanelOpen,
      openHistory,
      openItem,
      readItems,
      togglePanel,
      unreadCount: unreadItems.length,
      unreadItems,
    }),
    [
      ackError,
      closeHistory,
      closePanel,
      isHistoryOpen,
      isPanelOpen,
      openHistory,
      openItem,
      readItems,
      requestsError,
      togglePanel,
      unreadItems,
    ],
  );

  if (!canView) {
    return children;
  }

  return (
    <AssistedMessagesContext.Provider value={value}>{children}</AssistedMessagesContext.Provider>
  );
}
