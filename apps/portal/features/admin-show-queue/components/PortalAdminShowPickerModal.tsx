'use client';

import type { PortalAdminUpcomingShowListItem } from '@fresh-prints/shared/types/portal/getPortalAdminUpcomingShowQueueDashboard.types';

import { usePortalAdminShowPicker } from '../context/PortalAdminShowPickerContext';

function formatShowWhen(scheduledStartAtMs: number | null, timeZone: string): string {
  if (scheduledStartAtMs === null) {
    return 'Schedule TBD';
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(scheduledStartAtMs));
}

export function PortalAdminShowPickerModal({
  shows,
  selectedShowId,
  timeZone,
  onSelectShow,
}: {
  shows: PortalAdminUpcomingShowListItem[];
  selectedShowId: string | null;
  timeZone: string;
  onSelectShow: (showId: string) => void;
}) {
  const { isShowPickerOpen, closeShowPicker } = usePortalAdminShowPicker();

  if (!isShowPickerOpen) {
    return null;
  }

  return (
    <div className="portal-admin-modal-root" role="presentation">
      <button aria-label="Close show list" className="portal-admin-modal-scrim" onClick={closeShowPicker} type="button" />
      <div
        aria-labelledby="portal-admin-show-picker-title"
        aria-modal="true"
        className="portal-admin-modal portal-admin-show-picker-modal"
        role="dialog"
      >
        <header className="portal-admin-modal-header">
          <div>
            <p className="portal-admin-eyebrow">Show Queue</p>
            <h3 id="portal-admin-show-picker-title">Select a show</h3>
          </div>
          <button className="portal-button portal-button-secondary" onClick={closeShowPicker} type="button">
            Close
          </button>
        </header>
        <div className="portal-admin-modal-body">
          {shows.length === 0 ? (
            <p className="portal-admin-empty">No upcoming shows</p>
          ) : (
            <ul className="portal-admin-show-picker-list">
              {shows.map((show) => {
                const isActive = show.showId === selectedShowId;
                return (
                  <li key={show.showId}>
                    <button
                      aria-current={isActive ? 'true' : undefined}
                      className={`portal-admin-show-picker-option${isActive ? ' is-active' : ''}`}
                      onClick={() => {
                        onSelectShow(show.showId);
                        closeShowPicker();
                      }}
                      type="button"
                    >
                      <span className="portal-admin-show-picker-option-title">{show.title}</span>
                      <span className="portal-admin-show-picker-option-when">
                        {formatShowWhen(show.scheduledStartAtMs, timeZone)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
