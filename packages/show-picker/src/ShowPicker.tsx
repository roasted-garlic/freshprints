import { useEffect, useMemo, useRef, useState } from "react";

import {
  SHOW_CALENDAR_NO_DATE_KEY,
  buildCalendarMonthWeeks,
  formatCalendarDayGroupLabel,
  formatCalendarMonthLabel,
  getEarliestShowDateKey,
  parseLocalDateKey,
  shiftCalendarMonth,
  toLocalDateKey,
} from "@fresh-prints/shared/utils/showCalendarGrid";

import { getDefaultShowPickerOptionId } from "./getDefaultShowPickerOptionId";
import { getShowPickerDayMarker } from "./getShowPickerDayMarker";
import type { ShowPickerOption, ShowPickerProps } from "./types";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Scroll selected slot / capacity detail into view after calendar layout settles. */
function scheduleScrollSelectedSlotIntoView(
  root: HTMLElement,
  calendar: HTMLElement | null,
): () => void {
  let cancelled = false;
  let rafId = 0;
  let resizeRafId = 0;

  const scrollSelectedIntoView = () => {
    if (cancelled) {
      return;
    }

    const target =
      (root.querySelector(".show-picker-slot.is-selected") as HTMLElement | null) ??
      (root.querySelector(".show-picker-slots") as HTMLElement | null);

    if (target) {
      // Prefer end so a taller month grid still leaves the capacity/progress bar in view.
      target.scrollIntoView({ block: "end", inline: "nearest" });
      return;
    }

    // No slot yet — reveal the bottom of the picker (where slots will land).
    const scrollParent = findVerticalScrollParent(root);
    if (scrollParent) {
      scrollParent.scrollTop = scrollParent.scrollHeight;
    }
  };

  rafId = window.requestAnimationFrame(() => {
    rafId = window.requestAnimationFrame(scrollSelectedIntoView);
  });

  let observer: ResizeObserver | null = null;
  if (calendar && typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(resizeRafId);
      resizeRafId = window.requestAnimationFrame(scrollSelectedIntoView);
    });
    observer.observe(calendar);
  }

  // Stop observing shortly after layout settles so window resize does not keep fighting the user.
  const disconnectTimer = window.setTimeout(() => {
    observer?.disconnect();
    observer = null;
  }, 400);

  return () => {
    cancelled = true;
    window.cancelAnimationFrame(rafId);
    window.cancelAnimationFrame(resizeRafId);
    window.clearTimeout(disconnectTimer);
    observer?.disconnect();
  };
}

function findVerticalScrollParent(start: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = start.parentElement;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      current.scrollHeight > current.clientHeight
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function groupOptionsByDateKey(options: ShowPickerOption[]): Map<string, ShowPickerOption[]> {
  const groups = new Map<string, ShowPickerOption[]>();

  for (const option of options) {
    const dateKey = option.scheduledAt ? toLocalDateKey(option.scheduledAt) : SHOW_CALENDAR_NO_DATE_KEY;
    const existing = groups.get(dateKey);

    if (existing) {
      existing.push(option);
    } else {
      groups.set(dateKey, [option]);
    }
  }

  for (const group of groups.values()) {
    group.sort((left, right) => {
      const leftMillis = left.scheduledAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const rightMillis = right.scheduledAt?.getTime() ?? Number.POSITIVE_INFINITY;
      return leftMillis - rightMillis;
    });
  }

  return groups;
}

function ShowTimeSlotOption({
  option,
  isSelected,
  onSelect,
}: {
  option: ShowPickerOption;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const cardStateClass = option.isOverCapacity ? " is-over-capacity" : option.isFull ? " is-full" : "";
  const projectedPercent = Math.min(100, option.capacityPercent ?? 0);
  const committedPercent =
    option.committedCapacityPercent === undefined
      ? projectedPercent
      : Math.min(100, option.committedCapacityPercent);
  const hasPendingPreview = option.committedCapacityPercent !== undefined && projectedPercent > committedPercent;
  const [pendingDisplayPercent, setPendingDisplayPercent] = useState(committedPercent);

  useEffect(() => {
    if (!hasPendingPreview) {
      setPendingDisplayPercent(committedPercent);
      return;
    }

    // Start at committed fill, then ease to projected so the bar visibly “fills”.
    // Double rAF ensures the browser paints the start width before transitioning.
    setPendingDisplayPercent(committedPercent);
    let secondFrameId = 0;
    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        setPendingDisplayPercent(projectedPercent);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      window.cancelAnimationFrame(secondFrameId);
    };
  }, [committedPercent, hasPendingPreview, option.id, projectedPercent]);

  const isClosedForAdd = option.isSelectable === false;

  return (
    <button
      aria-disabled={isClosedForAdd}
      className={`show-picker-slot${isSelected ? " is-selected" : ""}${cardStateClass}${hasPendingPreview ? " has-pending-fill" : ""}${isClosedForAdd ? " is-disabled" : ""}`}
      onClick={() => {
        onSelect(option.id);
      }}
      type="button"
    >
      <div className="show-picker-slot-main">
        <span className="show-picker-slot-time">{option.timeLabel}</span>
        <div
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(projectedPercent)}
          className="show-picker-slot-bar-track"
          role="progressbar"
        >
          {hasPendingPreview ? (
            <div
              className={`show-picker-slot-bar-fill show-picker-slot-bar-fill--pending${option.fillLevel ? ` is-${option.fillLevel}` : ""}`}
              style={{ width: `${pendingDisplayPercent}%` }}
            />
          ) : null}
          <div
            className={`show-picker-slot-bar-fill${option.fillLevel ? ` is-${option.fillLevel}` : ""}`}
            style={{ width: `${committedPercent}%` }}
          />
        </div>
        <div className="show-picker-slot-meta">
          <span className="show-picker-slot-capacity" aria-label={option.capacityLabel}>
            <span aria-hidden="true" className="show-picker-slot-copy-full">
              {option.capacityLabel}
            </span>
            {option.capacityLabelShort ? (
              <span aria-hidden="true" className="show-picker-slot-copy-short">
                {option.capacityLabelShort}
              </span>
            ) : null}
          </span>
          {option.cutoffMetaLabel ? (
            <span
              aria-label={option.cutoffMetaLabel}
              className={`show-picker-slot-cutoff${option.cutoffMetaUrgency ? ` is-${option.cutoffMetaUrgency}` : ""}`}
            >
              <span aria-hidden="true" className="show-picker-slot-copy-full">
                {option.cutoffMetaLabel}
              </span>
              {option.cutoffMetaLabelShort ? (
                <span aria-hidden="true" className="show-picker-slot-copy-short">
                  {option.cutoffMetaLabelShort}
                </span>
              ) : null}
            </span>
          ) : null}
        </div>
      </div>
      <span className={`show-picker-badge show-picker-badge--${option.statusVariant}`}>{option.statusLabel}</span>
    </button>
  );
}

export function ShowPicker({ options, selectedId, onSelect, now = new Date(), className }: ShowPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const calendarGridRef = useRef<HTMLDivElement>(null);
  const optionsByDateKey = useMemo(() => groupOptionsByDateKey(options), [options]);
  const showDateKeys = useMemo(
    () => new Set([...optionsByDateKey.keys()].filter((key) => key !== SHOW_CALENDAR_NO_DATE_KEY)),
    [optionsByDateKey],
  );
  const selectableDateKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const [dateKey, dayOptions] of optionsByDateKey) {
      if (dateKey === SHOW_CALENDAR_NO_DATE_KEY) {
        continue;
      }
      // Any day with shows is inspectable (open, cutoff-closed, or past).
      if (dayOptions.length > 0) {
        keys.add(dateKey);
      }
    }
    return keys;
  }, [optionsByDateKey]);
  const earliestDateKey = useMemo(
    () => getEarliestShowDateKey(selectableDateKeys.size > 0 ? selectableDateKeys : showDateKeys),
    [selectableDateKeys, showDateKeys],
  );
  const selectedOptionDateKey = useMemo(() => {
    if (!selectedId) {
      return null;
    }

    const selected = options.find((option) => option.id === selectedId);
    if (!selected) {
      return null;
    }

    return selected.scheduledAt ? toLocalDateKey(selected.scheduledAt) : SHOW_CALENDAR_NO_DATE_KEY;
  }, [options, selectedId]);

  const initialMonth = useMemo(() => {
    const anchorKey = selectedOptionDateKey && selectedOptionDateKey !== SHOW_CALENDAR_NO_DATE_KEY
      ? selectedOptionDateKey
      : earliestDateKey;

    if (anchorKey) {
      const anchorDate = parseLocalDateKey(anchorKey);
      return formatCalendarMonthLabel(anchorDate.getFullYear(), anchorDate.getMonth());
    }

    return formatCalendarMonthLabel(now.getFullYear(), now.getMonth());
  }, [earliestDateKey, now, selectedOptionDateKey]);

  const [viewYear, setViewYear] = useState(initialMonth.year);
  const [viewMonth, setViewMonth] = useState(initialMonth.month);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(
    selectedOptionDateKey && selectedOptionDateKey !== SHOW_CALENDAR_NO_DATE_KEY ? selectedOptionDateKey : earliestDateKey,
  );

  useEffect(() => {
    setViewYear(initialMonth.year);
    setViewMonth(initialMonth.month);
  }, [initialMonth.month, initialMonth.year]);

  useEffect(() => {
    if (selectedOptionDateKey && selectedOptionDateKey !== SHOW_CALENDAR_NO_DATE_KEY) {
      setSelectedDateKey(selectedOptionDateKey);
      const selectedDate = parseLocalDateKey(selectedOptionDateKey);
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
      return;
    }

    if (!selectedDateKey && earliestDateKey) {
      setSelectedDateKey(earliestDateKey);
    }
  }, [earliestDateKey, selectedDateKey, selectedOptionDateKey]);

  const dayMarkerByDateKey = useMemo(() => {
    const markers = new Map<string, NonNullable<ReturnType<typeof getShowPickerDayMarker>>>();

    for (const [dateKey, dayOptions] of optionsByDateKey) {
      if (dateKey === SHOW_CALENDAR_NO_DATE_KEY) {
        continue;
      }

      const marker = getShowPickerDayMarker(dayOptions);
      if (marker) {
        markers.set(dateKey, marker);
      }
    }

    return markers;
  }, [optionsByDateKey]);

  const weeks = useMemo(
    () =>
      buildCalendarMonthWeeks(viewYear, viewMonth, showDateKeys, now, {
        weekStartsOn: "monday",
        trimEmptyWeeks: true,
      }),
    [now, showDateKeys, viewMonth, viewYear],
  );
  const monthLabel = useMemo(() => formatCalendarMonthLabel(viewYear, viewMonth).label, [viewMonth, viewYear]);
  const slotsForSelectedDate = selectedDateKey ? (optionsByDateKey.get(selectedDateKey) ?? []) : [];
  const unscheduledOptions = optionsByDateKey.get(SHOW_CALENDAR_NO_DATE_KEY) ?? [];

  function handlePreviousMonth() {
    const next = shiftCalendarMonth(viewYear, viewMonth, -1);
    setViewYear(next.year);
    setViewMonth(next.month);
  }

  function handleNextMonth() {
    const next = shiftCalendarMonth(viewYear, viewMonth, 1);
    setViewYear(next.year);
    setViewMonth(next.month);
  }

  function handleSelectDate(dateKey: string) {
    if (!selectableDateKeys.has(dateKey)) {
      return;
    }
    setSelectedDateKey(dateKey);
    const slots = optionsByDateKey.get(dateKey) ?? [];
    const defaultSlotId = getDefaultShowPickerOptionId(slots, undefined, true);
    if (defaultSlotId) {
      onSelect(defaultSlotId);
    }
  }

  useEffect(() => {
    if (selectedId && options.some((option) => option.id === selectedId)) {
      return;
    }

    const defaultOptionId = getDefaultShowPickerOptionId(options, undefined, true);
    if (defaultOptionId) {
      onSelect(defaultOptionId);
    }
  }, [onSelect, options, selectedId]);

  // When a date/month selection grows the calendar (more weeks), keep the
  // selected show's capacity/progress block visible in the scroll parent.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    return scheduleScrollSelectedSlotIntoView(root, calendarGridRef.current);
  }, [selectedDateKey, selectedId, viewMonth, viewYear, weeks.length]);

  const rootClassName = className ? `show-picker ${className}` : "show-picker";

  return (
    <div className={rootClassName} ref={rootRef}>
      <div className="show-picker-calendar">
        <div className="show-picker-calendar-header">
          <button
            aria-label="Previous month"
            className="show-picker-nav-button"
            onClick={handlePreviousMonth}
            type="button"
          >
            ‹
          </button>
          <p className="show-picker-month-label">{monthLabel}</p>
          <button aria-label="Next month" className="show-picker-nav-button" onClick={handleNextMonth} type="button">
            ›
          </button>
        </div>

        <div className="show-picker-weekdays" aria-hidden="true">
          {WEEKDAY_LABELS.map((label) => (
            <span className="show-picker-weekday" key={label}>
              {label}
            </span>
          ))}
        </div>

        <div
          aria-label={`${monthLabel} show calendar`}
          className="show-picker-grid"
          ref={calendarGridRef}
          role="grid"
        >
          {weeks.map((week, weekIndex) => (
            <div className="show-picker-week" key={`week-${weekIndex}`} role="row">
              {week.map((day) => {
                const isSelected = day.dateKey === selectedDateKey;
                const dayHasSelectableShows = selectableDateKeys.has(day.dateKey);
                const isDisabled = !day.hasShows || !dayHasSelectableShows;
                const dayMarker = dayMarkerByDateKey.get(day.dateKey);
                const markerClass = dayMarker ? `has-shows-${dayMarker}` : day.hasShows ? "has-shows-open" : "";
                const dayHasOnlyClosedShows =
                  day.hasShows &&
                  (optionsByDateKey.get(day.dateKey) ?? []).every((option) => option.isSelectable === false);
                const dayClassName = [
                  "show-picker-day",
                  day.isCurrentMonth ? "" : "is-outside-month",
                  day.isToday ? "is-today" : "",
                  day.hasShows ? "has-shows" : "",
                  dayHasOnlyClosedShows ? "is-past-only" : "",
                  markerClass,
                  isSelected ? "is-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                const markerAria =
                  dayMarker === "full"
                    ? ", full shows"
                    : dayMarker === "completed"
                      ? ", completed shows"
                      : dayHasOnlyClosedShows
                        ? ", closed shows"
                        : day.hasShows
                          ? ", has shows"
                          : ", no shows";

                return (
                  <button
                    aria-label={`${day.dayOfMonth}${markerAria}`}
                    aria-pressed={isSelected}
                    className={dayClassName}
                    disabled={isDisabled}
                    key={day.dateKey}
                    onClick={() => handleSelectDate(day.dateKey)}
                    role="gridcell"
                    type="button"
                  >
                    <span className="show-picker-day-number">{day.dayOfMonth}</span>
                    {day.hasShows ? (
                      <span className={`show-picker-day-dot show-picker-day-dot--${dayMarker ?? "open"}`} aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {selectedDateKey && slotsForSelectedDate.length > 0 ? (
        <div className="show-picker-slots">
          <p className="show-picker-slots-label">{formatCalendarDayGroupLabel(selectedDateKey)}</p>
          <div className="show-picker-slots-list">
            {slotsForSelectedDate.map((option) => (
              <ShowTimeSlotOption
                isSelected={option.id === selectedId}
                key={option.id}
                onSelect={onSelect}
                option={option}
              />
            ))}
          </div>
        </div>
      ) : null}

      {unscheduledOptions.length > 0 ? (
        <div className="show-picker-slots">
          <p className="show-picker-slots-label">{formatCalendarDayGroupLabel(SHOW_CALENDAR_NO_DATE_KEY)}</p>
          <div className="show-picker-slots-list">
            {unscheduledOptions.map((option) => (
              <ShowTimeSlotOption
                isSelected={option.id === selectedId}
                key={option.id}
                onSelect={onSelect}
                option={option}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
