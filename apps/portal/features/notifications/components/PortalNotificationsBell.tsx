'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Bell, ChevronDown, X } from 'lucide-react';

import { usePortalNotifications } from '../context/PortalNotificationsProvider';
import type { PortalCustomerNotification } from '../services/customerNotificationsService';
import { PortalNotificationHistoryModal } from './PortalNotificationHistoryModal';

const PREVIEW_LIMIT = 6;
const ENABLE_ALERTS_EXPANDED_KEY = 'portal-alerts-enable-cta-expanded';

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

function EnableAlertsCallout({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) {
  const detailsId = useId();
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    try {
      return window.sessionStorage.getItem(ENABLE_ALERTS_EXPANDED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(ENABLE_ALERTS_EXPANDED_KEY, expanded ? '1' : '0');
    } catch {
      // Ignore storage failures (private mode / quota).
    }
  }, [expanded]);

  return (
    <div className="portal-notifications-enable-callout">
      <button
        aria-controls={detailsId}
        aria-expanded={expanded}
        className="portal-notifications-enable-callout-toggle"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <span>Enable alerts</span>
        <ChevronDown
          aria-hidden
          className={`portal-notifications-enable-callout-chevron${expanded ? ' is-open' : ''}`}
          size={14}
          strokeWidth={2}
        />
      </button>
      {expanded ? (
        <div className="portal-notifications-enable-callout-body" id={detailsId}>
          <p className="portal-muted">
            Get notified even when Portal is in the background.
          </p>
          <button
            className="portal-link-button"
            onClick={() => {
              void onOpenSettings();
            }}
            type="button"
          >
            Open alert settings
          </button>
        </div>
      ) : null}
    </div>
  );
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
  // Pin unread list at open so mark-read cannot empty the dropdown mid-click.
  // Newly arrived unread alerts still prepend while the panel stays open.
  const [preview, setPreview] = useState(() => buildPanelPreview(unreadItems));
  const showMarkAll = preview.length > 0;

  useEffect(() => {
    setPreview((current) => {
      const currentIds = new Set(current.map((item) => item.id));
      const newcomers = unreadItems.filter((item) => !currentIds.has(item.id));
      if (newcomers.length === 0) {
        return current;
      }
      return buildPanelPreview([...newcomers, ...current]);
    });
  }, [unreadItems]);

  return (
    <section
      aria-label="Notifications"
      className="portal-notifications-panel"
      role="dialog"
    >
      <header className="portal-notifications-panel-header">
        <div className="portal-notifications-panel-header-copy">
          <h2 className="portal-notifications-panel-title">Notifications</h2>
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
        <EnableAlertsCallout onOpenSettings={openNotificationSettings} />
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
            ) : unreadCount > 0 ? (
              <span aria-hidden className="portal-notifications-bell-badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </span>
          <span className="portal-app-header-action-label">Alerts</span>
        </button>
        {isPanelOpen ? <PortalNotificationsPanel /> : null}
      </div>
      <PortalNotificationHistoryModal />
    </>
  );
}
