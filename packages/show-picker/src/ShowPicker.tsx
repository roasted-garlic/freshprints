import { useEffect, useMemo, useState } from "react";

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

import type { ShowPickerOption, ShowPickerProps } from "./types";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

  return (
    <button
      className={`show-picker-slot${isSelected ? " is-selected" : ""}${cardStateClass}`}
      onClick={() => onSelect(option.id)}
      type="button"
    >
      <div className="show-picker-slot-main">
        <span className="show-picker-slot-time">{option.timeLabel}</span>
        <div className="show-picker-slot-bar-track">
          <div
            className={`show-picker-slot-bar-fill${option.fillLevel ? ` is-${option.fillLevel}` : ""}`}
            style={{ width: `${Math.min(100, option.capacityPercent ?? 0)}%` }}
          />
        </div>
        <span className="show-picker-slot-capacity">{option.capacityLabel}</span>
      </div>
      <span className={`show-picker-badge show-picker-badge--${option.statusVariant}`}>{option.statusLabel}</span>
    </button>
  );
}

export function ShowPicker({ options, selectedId, onSelect, now = new Date(), className }: ShowPickerProps) {
  const optionsByDateKey = useMemo(() => groupOptionsByDateKey(options), [options]);
  const showDateKeys = useMemo(
    () => new Set([...optionsByDateKey.keys()].filter((key) => key !== SHOW_CALENDAR_NO_DATE_KEY)),
    [optionsByDateKey],
  );
  const earliestDateKey = useMemo(() => getEarliestShowDateKey(showDateKeys), [showDateKeys]);
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

  const weeks = useMemo(
    () =>
      buildCalendarMonthWeeks(viewYear, viewMonth, showDateKeys, now, {
        weekStartsOn: "monday",
        trimEmptyWeeks: true,
      }),
    [now, showDateKeys, viewMonth, viewYear],
  );
  const monthLabel = useMemo(() => formatCalendarMonthLabel(viewYear, viewMonth).label, [viewMonth, viewYear]);
  const slotsForSelectedDate = selectedDateKey ? optionsByDateKey.get(selectedDateKey) ?? [] : [];
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
    setSelectedDateKey(dateKey);
    const firstSlot = optionsByDateKey.get(dateKey)?.[0];
    if (firstSlot) {
      onSelect(firstSlot.id);
    }
  }

  useEffect(() => {
    if (selectedId && options.some((option) => option.id === selectedId)) {
      return;
    }

    const defaultDateKey = selectedDateKey ?? earliestDateKey;
    if (defaultDateKey) {
      const firstSlot = optionsByDateKey.get(defaultDateKey)?.[0];
      if (firstSlot) {
        onSelect(firstSlot.id);
      }
      return;
    }

    const firstUnscheduled = optionsByDateKey.get(SHOW_CALENDAR_NO_DATE_KEY)?.[0];
    if (firstUnscheduled) {
      onSelect(firstUnscheduled.id);
    }
  }, [earliestDateKey, onSelect, options, optionsByDateKey, selectedDateKey, selectedId]);

  const rootClassName = className ? `show-picker ${className}` : "show-picker";

  return (
    <div className={rootClassName}>
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

        <div className="show-picker-grid" role="grid" aria-label={`${monthLabel} show calendar`}>
          {weeks.map((week, weekIndex) => (
            <div className="show-picker-week" key={`week-${weekIndex}`} role="row">
              {week.map((day) => {
                const isSelected = day.dateKey === selectedDateKey;
                const isDisabled = !day.hasShows;
                const dayClassName = [
                  "show-picker-day",
                  day.isCurrentMonth ? "" : "is-outside-month",
                  day.isToday ? "is-today" : "",
                  day.hasShows ? "has-shows" : "",
                  isSelected ? "is-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <button
                    aria-label={`${day.dayOfMonth}${day.hasShows ? ", has shows" : ", no shows"}`}
                    aria-pressed={isSelected}
                    className={dayClassName}
                    disabled={isDisabled}
                    key={day.dateKey}
                    onClick={() => handleSelectDate(day.dateKey)}
                    role="gridcell"
                    type="button"
                  >
                    <span className="show-picker-day-number">{day.dayOfMonth}</span>
                    {day.hasShows ? <span className="show-picker-day-dot" aria-hidden="true" /> : null}
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
