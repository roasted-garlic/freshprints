import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getOperationalDayWindow, SHOW_QUEUE_OPERATIONAL_TIME_ZONE } from "./operationalDay";

describe("Show Queue operational day", () => {
  it("uses America/Chicago standard-time midnight", () => {
    const day = getOperationalDayWindow(new Date("2026-01-15T18:00:00.000Z"));
    assert.equal(day.timeZone, SHOW_QUEUE_OPERATIONAL_TIME_ZONE);
    assert.equal(day.dateKey, "2026-01-15");
    assert.equal(day.start.toISOString(), "2026-01-15T06:00:00.000Z");
    assert.equal(day.nextStart.toISOString(), "2026-01-16T06:00:00.000Z");
  });

  it("uses America/Chicago daylight-time midnight", () => {
    const day = getOperationalDayWindow(new Date("2026-07-15T18:00:00.000Z"));
    assert.equal(day.start.toISOString(), "2026-07-15T05:00:00.000Z");
    assert.equal(day.nextStart.toISOString(), "2026-07-16T05:00:00.000Z");
  });

  it("keeps the spring-forward day at 23 hours", () => {
    const before = getOperationalDayWindow(new Date("2026-03-08T05:59:59.999Z"));
    const atStart = getOperationalDayWindow(new Date("2026-03-08T06:00:00.000Z"));
    assert.equal(before.dateKey, "2026-03-07");
    assert.equal(atStart.dateKey, "2026-03-08");
    assert.equal(atStart.start.toISOString(), "2026-03-08T06:00:00.000Z");
    assert.equal(atStart.nextStart.toISOString(), "2026-03-09T05:00:00.000Z");
    assert.equal(atStart.nextStartMs - atStart.startMs, 23 * 60 * 60 * 1000);
  });

  it("keeps the fall-back day at 25 hours and uses an exclusive upper bound", () => {
    const day = getOperationalDayWindow(new Date("2026-11-01T17:00:00.000Z"));
    const atNextStart = getOperationalDayWindow(new Date("2026-11-02T06:00:00.000Z"));
    assert.equal(day.dateKey, "2026-11-01");
    assert.equal(day.start.toISOString(), "2026-11-01T05:00:00.000Z");
    assert.equal(day.nextStart.toISOString(), "2026-11-02T06:00:00.000Z");
    assert.equal(day.nextStartMs - day.startMs, 25 * 60 * 60 * 1000);
    assert.equal(atNextStart.dateKey, "2026-11-02");
  });
});
