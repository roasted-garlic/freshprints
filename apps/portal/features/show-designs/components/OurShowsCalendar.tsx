'use client';

import { useMemo, useState } from 'react';

import type { PortalPublicShowSummary } from '@fresh-prints/shared/types/portal/listPortalPublicShows.types';
import {
  buildCalendarMonthWeeks,
  formatCalendarDayGroupLabel,
  formatCalendarMonthLabel,
  getEarliestShowDateKey,
  parseLocalDateKey,
  shiftCalendarMonth,
  toLocalDateKey,
} from '@fresh-prints/shared/utils/showCalendarGrid';
import { formatShowTimeOnlyLabel } from '@fresh-prints/shared/utils/showDateTimeDisplay';

import {
  formatOurShowsCapacityBorderLabel,
  formatOurShowsTimingLabel,
  pickDominantCapacityBorder,
  resolveOurShowsCapacityBorder,
  resolveOurShowsTiming,
  type OurShowsCapacityBorder,
  type OurShowsTiming,
} from '../utils/ourShowsLifecycle';
import { SHOW_DESIGN_COUNT_DISCLAIMER } from '../utils/showDesignCountDisclaimer';

interface OurShowsCalendarProps {
  onOpenShow: (showId: string) => void;
  shows: readonly PortalPublicShowSummary[];
}

interface DayShowEntry {
  border: OurShowsCapacityBorder;
  designCount: number;
  id: string;
  timeLabel: string;
  timing: OurShowsTiming;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function sumDesignCounts(entries: readonly DayShowEntry[]): number {
  return entries.reduce((total, entry) => total + entry.designCount, 0);
}

function dayTimingClass(entries: readonly DayShowEntry[]): OurShowsTiming {
  if (entries.some((entry) => entry.timing === 'upcoming')) {
    return 'upcoming';
  }
  return 'past';
}

export function OurShowsCalendar({ onOpenShow, shows }: OurShowsCalendarProps) {
  const now = useMemo(() => new Date(), []);

  const showsByDateKey = useMemo(() => {
    const groups = new Map<string, DayShowEntry[]>();

    for (const show of shows) {
      if (!show.scheduledStartAt) {
        continue;
      }

      const scheduledAt = new Date(show.scheduledStartAt);
      const timing = resolveOurShowsTiming({
        now,
        productionStatus: show.productionStatus,
        scheduledStartAt: scheduledAt,
      });
      const entry: DayShowEntry = {
        border: resolveOurShowsCapacityBorder({
          productionStatus: show.productionStatus,
        }),
        designCount: show.uniquePublicCatalogDesignCount,
        id: show.id,
        timeLabel: formatShowTimeOnlyLabel(scheduledAt),
        timing,
      };

      const dateKey = toLocalDateKey(scheduledAt);
      const existing = groups.get(dateKey);
      if (existing) {
        existing.push(entry);
      } else {
        groups.set(dateKey, [entry]);
      }
    }

    for (const entries of groups.values()) {
      entries.sort((left, right) => left.timeLabel.localeCompare(right.timeLabel));
    }

    return groups;
  }, [now, shows]);

  const showDateKeys = useMemo(() => new Set(showsByDateKey.keys()), [showsByDateKey]);
  const earliestDateKey = useMemo(() => getEarliestShowDateKey(showDateKeys), [showDateKeys]);
  const initialMonth = useMemo(() => {
    if (earliestDateKey) {
      const start = parseLocalDateKey(earliestDateKey);
      return formatCalendarMonthLabel(start.getFullYear(), start.getMonth());
    }
    return formatCalendarMonthLabel(now.getFullYear(), now.getMonth());
  }, [earliestDateKey, now]);

  const [viewMonth, setViewMonth] = useState(initialMonth.month);
  const [viewYear, setViewYear] = useState(initialMonth.year);
  const [pickerDateKey, setPickerDateKey] = useState<string | null>(null);

  const weeks = useMemo(
    () =>
      buildCalendarMonthWeeks(viewYear, viewMonth, showDateKeys, now, {
        weekStartsOn: 'monday',
      }),
    [now, showDateKeys, viewMonth, viewYear],
  );

  const monthLabel = formatCalendarMonthLabel(viewYear, viewMonth).label;
  const pickerShows = pickerDateKey ? (showsByDateKey.get(pickerDateKey) ?? []) : [];

  const handleDayClick = (dateKey: string, entries: readonly DayShowEntry[]) => {
    if (entries.length === 1) {
      onOpenShow(entries[0].id);
      return;
    }
    setPickerDateKey(dateKey);
  };

  return (
    <>
      <div className="our-shows-calendar">
        <div className="our-shows-calendar-panel">
          <div className="our-shows-calendar-header">
            <button
              aria-label="Previous month"
              className="our-shows-nav-button"
              onClick={() => {
                const next = shiftCalendarMonth(viewYear, viewMonth, -1);
                setViewMonth(next.month);
                setViewYear(next.year);
              }}
              type="button"
            >
              ‹
            </button>
            <p className="our-shows-month-label">{monthLabel}</p>
            <button
              aria-label="Next month"
              className="our-shows-nav-button"
              onClick={() => {
                const next = shiftCalendarMonth(viewYear, viewMonth, 1);
                setViewMonth(next.month);
                setViewYear(next.year);
              }}
              type="button"
            >
              ›
            </button>
          </div>

          <div aria-hidden="true" className="our-shows-weekdays">
            {WEEKDAY_LABELS.map((label) => (
              <span className="our-shows-weekday" key={label}>
                {label}
              </span>
            ))}
          </div>

          <div aria-label={`${monthLabel} shows`} className="our-shows-grid" role="grid">
            {weeks.map((week, weekIndex) => (
              <div className="our-shows-week" key={`week-${weekIndex}`} role="row">
                {week.map((day) => {
                  const entries = showsByDateKey.get(day.dateKey) ?? [];
                  const designCount = sumDesignCounts(entries);
                  const hasShows = entries.length > 0;
                  const timing = hasShows ? dayTimingClass(entries) : null;
                  const border = hasShows
                    ? pickDominantCapacityBorder(entries.map((entry) => entry.border))
                    : null;
                  const className = [
                    'our-shows-day',
                    day.isCurrentMonth ? '' : 'is-outside-month',
                    day.isToday ? 'is-today' : '',
                    hasShows
                      ? `has-shows is-timing-${timing === 'past' ? 'aired' : timing} is-border-${border}`
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <button
                      aria-label={
                        hasShows
                          ? `${day.dayOfMonth}, ${designCount} design${designCount === 1 ? '' : 's'} — open show gallery`
                          : `${day.dayOfMonth}, no shows`
                      }
                      className={className}
                      disabled={!hasShows}
                      key={day.dateKey}
                      onClick={() => handleDayClick(day.dateKey, entries)}
                      role="gridcell"
                      type="button"
                    >
                      <span className="our-shows-day-number">{day.dayOfMonth}</span>
                      {hasShows ? (
                        <span className="our-shows-day-count">
                          <strong>{designCount}</strong>
                          <span className="our-shows-day-count-label">
                            {designCount === 1 ? 'design' : 'designs'}
                          </span>
                        </span>
                      ) : (
                        <span aria-hidden="true" className="our-shows-day-empty">
                          —
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <p className="our-shows-calendar-hint portal-muted">
            Tap a highlighted day to browse the designs on that show.
          </p>
          <p className="our-shows-count-disclaimer">{SHOW_DESIGN_COUNT_DISCLAIMER}</p>
        </div>

        <div aria-label="Calendar legend" className="our-shows-calendar-legend">
          <div className="our-shows-legend-group">
            <span className="our-shows-legend-heading">Cell shading</span>
            <span className="our-shows-legend-item is-timing-upcoming">Upcoming</span>
            <span className="our-shows-legend-item is-timing-aired">Aired</span>
          </div>
          <span aria-hidden="true" className="our-shows-legend-separator" />
          <div className="our-shows-legend-group">
            <span className="our-shows-legend-heading">Border</span>
            <span className="our-shows-legend-item is-border-low">Plenty of room</span>
            <span className="our-shows-legend-item is-border-medium">Filling up</span>
            <span className="our-shows-legend-item is-border-high">Full</span>
          </div>
        </div>
      </div>

      {pickerDateKey && pickerShows.length > 0 ? (
        <div
          aria-labelledby="our-shows-picker-title"
          aria-modal="true"
          className="modal-overlay modal-overlay-blur our-shows-picker-overlay"
          onClick={() => setPickerDateKey(null)}
          role="dialog"
        >
          <div className="modal-panel our-shows-picker-modal" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header our-shows-picker-header">
              <div>
                <h2 id="our-shows-picker-title">{formatCalendarDayGroupLabel(pickerDateKey)}</h2>
                <p className="portal-muted">
                  {pickerShows.length} show{pickerShows.length === 1 ? '' : 's'} on this day — pick one to
                  browse designs.
                </p>
              </div>
              <button
                aria-label="Close"
                className="modal-close-button"
                onClick={() => setPickerDateKey(null)}
                type="button"
              >
                ×
              </button>
            </header>
            <ul className="our-shows-picker-list">
              {pickerShows.map((show) => (
                <li key={show.id}>
                  <button
                    className={`our-shows-picker-option is-timing-${show.timing === 'past' ? 'aired' : show.timing} is-border-${show.border}`}
                    onClick={() => {
                      setPickerDateKey(null);
                      onOpenShow(show.id);
                    }}
                    type="button"
                  >
                    <span className="our-shows-picker-time">{show.timeLabel}</span>
                    <span className="our-shows-picker-count">
                      {show.designCount} design{show.designCount === 1 ? '' : 's'}
                    </span>
                    <span className="our-shows-picker-status">
                      {formatOurShowsTimingLabel(show.timing)} ·{' '}
                      {formatOurShowsCapacityBorderLabel(show.border)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
