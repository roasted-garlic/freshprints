import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCalendarMonthWeeks,
  formatCalendarDayGroupLabel,
  getEarliestShowDateKey,
  shiftCalendarMonth,
  toLocalDateKey,
} from "./showCalendarGrid";

describe("toLocalDateKey", () => {
  it("formats a local calendar date key", () => {
    const key = toLocalDateKey(new Date(2026, 6, 11, 20, 0, 0));
    assert.equal(key, "2026-07-11");
  });
});

describe("buildCalendarMonthWeeks", () => {
  it("marks days with shows and builds six weeks", () => {
    const weeks = buildCalendarMonthWeeks(2026, 6, new Set(["2026-07-11", "2026-07-18"]), new Date(2026, 6, 7));
    assert.equal(weeks.length, 6);
    assert.equal(weeks.every((week) => week.length === 7), true);

    const july11 = weeks.flat().find((day) => day.dateKey === "2026-07-11");
    assert.ok(july11);
    assert.equal(july11.hasShows, true);
    assert.equal(july11.isCurrentMonth, true);

    const july10 = weeks.flat().find((day) => day.dateKey === "2026-07-10");
    assert.ok(july10);
    assert.equal(july10.hasShows, false);
  });

  it("flags today on the grid", () => {
    const now = new Date(2026, 6, 11, 15, 0, 0);
    const weeks = buildCalendarMonthWeeks(2026, 6, new Set(), now);
    const today = weeks.flat().find((day) => day.dateKey === "2026-07-11");
    assert.ok(today);
    assert.equal(today.isToday, true);
  });

  it("supports Monday-start weeks", () => {
    const weeks = buildCalendarMonthWeeks(2026, 6, new Set(["2026-07-11"]), new Date(2026, 6, 7), {
      weekStartsOn: "monday",
    });
    assert.equal(weeks[0][0].dateKey, "2026-06-29");
    assert.equal(weeks.flat().find((day) => day.dateKey === "2026-07-11")?.dayOfMonth, 11);
  });

  it("can trim weeks with no current-month or show days", () => {
    const weeks = buildCalendarMonthWeeks(2026, 6, new Set(["2026-07-11"]), new Date(2026, 6, 7), {
      trimEmptyWeeks: true,
    });
    assert.ok(weeks.length < 6);
    assert.ok(weeks.flat().some((day) => day.dateKey === "2026-07-11"));
  });
});

describe("shiftCalendarMonth", () => {
  it("moves forward and backward across year boundaries", () => {
    assert.deepEqual(shiftCalendarMonth(2026, 11, 1), { year: 2027, month: 0, label: "January 2027" });
    assert.deepEqual(shiftCalendarMonth(2026, 0, -1), { year: 2025, month: 11, label: "December 2025" });
  });
});

describe("getEarliestShowDateKey", () => {
  it("returns the earliest non no-date key", () => {
    assert.equal(getEarliestShowDateKey(["2026-07-18", "no-date", "2026-07-11"]), "2026-07-11");
  });
});

describe("formatCalendarDayGroupLabel", () => {
  it("formats a day group label", () => {
    const label = formatCalendarDayGroupLabel("2026-07-11");
    assert.match(label, /Jul/);
    assert.match(label, /11/);
  });
});
