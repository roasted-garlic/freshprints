import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Timestamp } from "firebase-admin/firestore";

import {
  isLeaseExpired,
  rateLimitDocId,
  utcDayKey,
  utcDayLabel,
} from "./customerUploadRateLimitHelpers";

describe("customerUploadRateLimit helpers", () => {
  it("formats UTC day key and label", () => {
    const date = new Date(Date.UTC(2026, 6, 11, 23, 30, 0));
    assert.equal(utcDayKey(date), "20260711");
    assert.equal(utcDayLabel(date), "2026-07-11");
  });

  it("builds rate-limit doc ids", () => {
    assert.equal(rateLimitDocId("uid123", "20260711"), "uid123_20260711");
  });

  it("detects expired leases", () => {
    const now = new Date("2026-07-11T12:00:00.000Z");
    const expired = Timestamp.fromDate(new Date("2026-07-11T11:59:00.000Z"));
    const active = Timestamp.fromDate(new Date("2026-07-11T12:01:00.000Z"));
    assert.equal(isLeaseExpired(expired, now), true);
    assert.equal(isLeaseExpired(active, now), false);
    assert.equal(isLeaseExpired(new Date("2026-07-11T11:00:00.000Z"), now), true);
  });
});
