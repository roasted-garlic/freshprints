'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';

import { usePortalNotifications } from '../context/PortalNotificationsProvider';
import type { PortalCustomerNotification } from '../services/customerNotificationsService';
import { PortalNotificationHistoryModal } from './PortalNotificationHistoryModal';

const PREVIEW_LIMIT = 6;

function formatWhen(value: Date | null): string {
  if (!value) {
    return '';
  }
  return value.toLocaleString();
}

function buildPanelPreview(
  unreadItems: PortalCustomerNotification[],
): PortalCustomerNotification[] {
  // Dropdown is unread-only. Never fall back to read items (history owns those).
  return unreadItems.slice(0, PREVIEW_LIMIT);
}

function PortalNotificationsPanel() {
  const {
    closePanel,
    error,
    isBrowserPushEnabled,
    markAllRead,
    openHistory,
    openItem,
    openNotificationSettings,
    retry,
    unreadItems,
  } = usePortalNotifications();
  // Pin unread list at open (defense in depth). Primary fix: mark-read waits until destination URL matches.
  const [preview] = useState(() => buildPanelPreview(unreadItems));
  const showMarkAll = preview.length > 0;

  return (
    <section
      aria-label="Notifications"
      className="portal-notifications-panel"
      role="dialog"
    >
      <header className="portal-notifications-panel-header">
        <div className="portal-notifications-panel-header-copy">
          <h2 className="portal-notifications-panel-title">Notifications</h2>
          <p className="portal-notifications-panel-description">
            Proofs and messages about your custom design requests.
          </p>
        </div>
        <button
          aria-label="Close"
          className="portal-notifications-panel-close"
          onClick={closePanel}
          type="button"
        >
          <X aria-hidden size={16} strokeWidth={2} />
        </button>
      </header>

      {error ? (
        <div className="portal-notifications-error" role="alert">
          <p className="portal-error">Could not load alerts. {error}</p>
          <button className="portal-link-button" onClick={retry} type="button">
            Try again
          </button>
        </div>
      ) : null}

      {!error && isBrowserPushEnabled === false ? (
        <p className="portal-notifications-enable-cta">
          <button
            className="portal-link-button"
            onClick={() => {
                      void openNotificationSettings();
                    }}
            type="button"
          >
            Enable alerts
          </button>
          <span className="portal-muted"> — get notified even when Portal is in the background.</span>
        </p>
      ) : null}

      {!error && preview.length === 0 ? (
        <p className="portal-muted portal-notifications-empty">You&apos;re all caught up.</p>
      ) : null}

      {preview.length > 0 ? (
        <ul className="portal-notifications-list">
          {preview.map((item) => (
            <li key={item.id}>
              <NotificationRow item={item} onOpen={openItem} />
            </li>
          ))}
        </ul>
      ) : null}

      <footer className="portal-notifications-panel-footer">
        {showMarkAll ? (
          <button className="portal-link-button" onClick={markAllRead} type="button">
            Mark all read
          </button>
        ) : null}
        <button className="portal-link-button" onClick={openHistory} type="button">
          History
        </button>
      </footer>
    </section>
  );
}

function NotificationRow({
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

export function PortalNotificationsBell() {
  const { isPanelOpen, togglePanel, unreadCount, closePanel, error } = usePortalNotifications();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPanelOpen) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        closePanel();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [closePanel, isPanelOpen]);

  const ariaLabel = error
    ? 'Notifications, failed to load alerts'
    : unreadCount > 0
      ? `Notifications, ${unreadCount} unread`
      : 'Notifications';

  return (
    <>
      <div className="portal-notifications-bell" ref={containerRef}>
        <button
          aria-expanded={isPanelOpen}
          aria-haspopup="dialog"
          aria-label={ariaLabel}
          className={`portal-app-header-action portal-notifications-bell-button${
            error ? ' is-error' : ''
          }`}
          onClick={togglePanel}
          type="button"
        >
          <span className="portal-app-header-action-icon">
            <Bell aria-hidden size={18} strokeWidth={2} />
            {error ? (
              <span aria-hidden className="portal-notifications-bell-badge is-error">
                !
              </span>
            ) : (
              <span
                aria-hidden
                className="portal-notifications-bell-badge"
                data-empty={unreadCount === 0 ? 'true' : 'false'}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
          <span className="portal-app-header-action-label">Alerts</span>
        </button>
        {isPanelOpen ? <PortalNotificationsPanel /> : null}
      </div>
      <PortalNotificationHistoryModal />
    </>
  );
}
