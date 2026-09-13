'use client';

import { useEffect } from 'react';

import { usePortalNotifications } from '../context/PortalNotificationsProvider';
import {
  CUSTOMER_NOTIFICATIONS_QUERY_LIMIT,
  type PortalCustomerNotification,
} from '../services/customerNotificationsService';
import { isCustomerNotificationPreservedFromHistoryClear } from '@fresh-prints/shared/utils/customerNotifications';

function formatWhen(value: Date | null): string {
  if (!value) {
    return '';
  }
  return value.toLocaleString();
}

function HistoryRow({
  item,
  onOpen,
}: {
  item: PortalCustomerNotification;
  onOpen: (item: PortalCustomerNotification) => void;
}) {
  return (
    <button
      className={`portal-notifications-item${item.readAt ? '' : ' is-unread'}`}
      onClick={() => onOpen(item)}
      type="button"
    >
      <strong>{item.title}</strong>
      <span>{item.body}</span>
      <span className="portal-notifications-item-time">{formatWhen(item.createdAt)}</span>
    </button>
  );
}

export function PortalNotificationHistoryModal() {
  const {
    clearHistory,
    closeHistory,
    error,
    historyItems,
    isClearingHistory,
    isHistoryOpen,
    openItem,
    retry,
  } = usePortalNotifications();

  useEffect(() => {
    if (!isHistoryOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeHistory();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeHistory, isHistoryOpen]);

  if (!isHistoryOpen) {
    return null;
  }

  const canClearHistory = historyItems.some(
    (item) => !isCustomerNotificationPreservedFromHistoryClear(item),
  );

  return (
    <div
      aria-labelledby="portal-notification-history-title"
      aria-modal="true"
      className="modal-overlay modal-overlay-blur"
      onClick={closeHistory}
      role="dialog"
    >
      <div
        className="modal-panel portal-notification-history-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="portal-notification-history-title">Notification history</h2>
        </header>

        <div className="modal-body portal-notification-history-body">
          <p className="portal-muted portal-notification-history-caption">
            Recent alerts from your last {CUSTOMER_NOTIFICATIONS_QUERY_LIMIT} notifications.
            Clear history keeps open permission requests.
          </p>

          {error ? (
            <div className="portal-notifications-error" role="alert">
              <p className="portal-error">Could not load alerts. {error}</p>
              <button className="portal-link-button" onClick={retry} type="button">
                Try again
              </button>
            </div>
          ) : null}

          {!error && historyItems.length === 0 ? (
            <p className="portal-muted">No cleared notifications yet.</p>
          ) : null}

          {historyItems.length > 0 ? (
            <ul className="portal-notifications-list portal-notification-history-list">
              {historyItems.map((item) => (
                <li key={item.id}>
                  <HistoryRow item={item} onOpen={openItem} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <footer className="modal-footer portal-notification-history-footer">
          {canClearHistory ? (
            <button
              className="portal-link-button"
              disabled={isClearingHistory}
              onClick={() => clearHistory()}
              type="button"
            >
              {isClearingHistory ? 'Clearing…' : 'Clear history'}
            </button>
          ) : (
            <span />
          )}
          <button className="portal-button portal-button-secondary" onClick={closeHistory} type="button">
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
