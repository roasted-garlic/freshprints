import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isWhatnotLiveBadgeText,
  parseWhatnotShowImportCandidate,
  parseWhatnotShowImportCandidates,
  resolveWhatnotShowDateText,
  stripScheduledLabel,
} from "./whatnotShowImportCandidate";

const SATURDAY_NOON = new Date(2026, 6, 4, 12, 0, 0, 0); // 2026-07-04 is a Saturday

test("isWhatnotLiveBadgeText: recognizes a live badge", () => {
  assert.equal(isWhatnotLiveBadgeText("Live · 24"), true);
  assert.equal(isWhatnotLiveBadgeText("live"), true);
  assert.equal(isWhatnotLiveBadgeText("Tue 8:00 PM"), false);
});

test("resolveWhatnotShowDateText: returns undefined for a 'Live · N' badge", () => {
  assert.equal(resolveWhatnotShowDateText("Live · 24", SATURDAY_NOON), undefined);
});

test("resolveWhatnotShowDateText: resolves a bare weekday badge with no comma, e.g. 'Tue 8:00 PM'", () => {
  const resolved = resolveWhatnotShowDateText("Tue 8:00 PM", SATURDAY_NOON);
  assert.ok(resolved);
  assert.equal(resolved.getDate(), 7);
  assert.equal(resolved.getHours(), 20);
});

test("resolveWhatnotShowDateText: resolves a bare weekday badge, e.g. 'Sat 8:00 PM', to next week not today", () => {
  const resolved = resolveWhatnotShowDateText("Sat 8:00 PM", SATURDAY_NOON);
  assert.ok(resolved);
  assert.equal(resolved.getDate(), 11);
});

test("resolveWhatnotShowDateText: resolves weekday text to next occurrence across a week boundary", () => {
  const resolved = resolveWhatnotShowDateText("Sun 8:00 PM", SATURDAY_NOON);
  assert.ok(resolved);
  assert.equal(resolved.getDate(), 5);
  assert.equal(resolved.getHours(), 20);
});

test("resolveWhatnotShowDateText: resolves explicit 'Weekday, Month Day, H:MM AM/PM', e.g. 'Sun, Jul 12, 8:00 PM'", () => {
  const resolved = resolveWhatnotShowDateText("Sun, Jul 12, 8:00 PM", SATURDAY_NOON);
  assert.ok(resolved);
  assert.equal(resolved.getMonth(), 6);
  assert.equal(resolved.getDate(), 12);
  assert.equal(resolved.getFullYear(), 2026);
  assert.equal(resolved.getHours(), 20);
});

test("resolveWhatnotShowDateText: resolves 'Sun, Aug 2, 7:00 PM'", () => {
  const resolved = resolveWhatnotShowDateText("Sun, Aug 2, 7:00 PM", SATURDAY_NOON);
  assert.ok(resolved);
  assert.equal(resolved.getMonth(), 7);
  assert.equal(resolved.getDate(), 2);
  assert.equal(resolved.getHours(), 19);
});

test("resolveWhatnotShowDateText: rolls over to next year for an implied-past date", () => {
  const december = new Date(2026, 11, 20, 12, 0, 0, 0);
  const resolved = resolveWhatnotShowDateText("Tue, Jan 5, 8:00 PM", december);
  assert.ok(resolved);
  assert.equal(resolved.getFullYear(), 2027);
  assert.equal(resolved.getMonth(), 0);
  assert.equal(resolved.getDate(), 5);
});

test("resolveWhatnotShowDateText: resolves the individual show dashboard's numeric 'M/D H:MMAM/PM' format", () => {
  const resolved = resolveWhatnotShowDateText("7/7 8:00PM", SATURDAY_NOON);
  assert.ok(resolved);
  assert.equal(resolved.getMonth(), 6);
  assert.equal(resolved.getDate(), 7);
  assert.equal(resolved.getHours(), 20);
  assert.equal(resolved.getMinutes(), 0);
});

test("resolveWhatnotShowDateText: numeric 'M/D H:MMAM/PM' rolls over to next year for an implied-past date", () => {
  const december = new Date(2026, 11, 20, 12, 0, 0, 0);
  const resolved = resolveWhatnotShowDateText("1/5 8:00PM", december);
  assert.ok(resolved);
  assert.equal(resolved.getFullYear(), 2027);
  assert.equal(resolved.getMonth(), 0);
  assert.equal(resolved.getDate(), 5);
});

test("resolveWhatnotShowDateText: rejects an out-of-range numeric month/day", () => {
  assert.equal(resolveWhatnotShowDateText("13/40 8:00PM", SATURDAY_NOON), undefined);
});

test("stripScheduledLabel: strips a 'Scheduled: ' prefix", () => {
  assert.equal(stripScheduledLabel("Scheduled: 7/7 8:00PM"), "7/7 8:00PM");
  assert.equal(stripScheduledLabel("scheduled:7/7 8:00PM"), "7/7 8:00PM");
});

test("stripScheduledLabel: returns trimmed text unchanged when there is no prefix", () => {
  assert.equal(stripScheduledLabel("  7/7 8:00PM  "), "7/7 8:00PM");
});

test("resolveWhatnotShowDateText: returns undefined for unrecognized text", () => {
  assert.equal(resolveWhatnotShowDateText("Sometime soon", SATURDAY_NOON), undefined);
  assert.equal(resolveWhatnotShowDateText("", SATURDAY_NOON), undefined);
});

test("parseWhatnotShowImportCandidate: parses a ready candidate", () => {
  const result = parseWhatnotShowImportCandidate(
    {
      href: "https://www.whatnot.com/live/3ec90737-9d2b-4cfb-8d40-ac848d16f5d8?referringSource=profile",
      title: "🔥SUNDAY EVENING DTF Transfers",
      dateText: "Sun, Jul 12, 8:00 PM",
    },
    SATURDAY_NOON,
  );

  assert.equal(result.status, "ready");
  assert.equal(result.whatnotShowId, "3ec90737-9d2b-4cfb-8d40-ac848d16f5d8");
  assert.equal(result.title, "🔥SUNDAY EVENING DTF Transfers");
  assert.ok(result.scheduledStartAt);
});

test("parseWhatnotShowImportCandidate: preserves emoji/special characters without corruption", () => {
  const result = parseWhatnotShowImportCandidate(
    {
      href: "https://www.whatnot.com/live/3ec90737-9d2b-4cfb-8d40-ac848d16f5d8",
      title: "🔥SUNDAY EVENING DTF Transfers | Low Starts•No Reserve",
      dateText: "Sun, Jul 12, 8:00 PM",
    },
    SATURDAY_NOON,
  );

  assert.equal(result.title, "🔥SUNDAY EVENING DTF Transfers | Low Starts•No Reserve");
});

test("parseWhatnotShowImportCandidate: marks a 'Live · N' badge as status live, with no invented scheduledStartAt", () => {
  const result = parseWhatnotShowImportCandidate(
    {
      href: "https://www.whatnot.com/live/bf834262-79ee-4c70-8eb9-9da3eb5fe91b",
      title: "Currently live show",
      dateText: "Live · 24",
    },
    SATURDAY_NOON,
  );

  assert.equal(result.status, "live");
  assert.equal(result.whatnotShowId, "bf834262-79ee-4c70-8eb9-9da3eb5fe91b");
  assert.equal(result.scheduledStartAt, undefined);
  assert.equal(result.rawDateText, "Live · 24");
});

test("parseWhatnotShowImportCandidate: needs_review when show ID cannot be extracted", () => {
  const result = parseWhatnotShowImportCandidate(
    { href: "https://www.whatnot.com/user/funkyfreshprints/shows", title: "Not a show link", dateText: "Tue 8:00 PM" },
    SATURDAY_NOON,
  );

  assert.equal(result.status, "needs_review");
  assert.ok(result.reviewReason);
});

test("parseWhatnotShowImportCandidate: needs_review when date/time text is unrecognized", () => {
  const result = parseWhatnotShowImportCandidate(
    {
      href: "https://www.whatnot.com/live/bf834262-79ee-4c70-8eb9-9da3eb5fe91b",
      title: "Mystery Show",
      dateText: "Starting soon",
    },
    SATURDAY_NOON,
  );

  assert.equal(result.status, "needs_review");
  assert.equal(result.whatnotShowId, "bf834262-79ee-4c70-8eb9-9da3eb5fe91b");
  assert.ok(result.reviewReason);
});

test("parseWhatnotShowImportCandidates: parses a realistic mixed batch without cross-card contamination", () => {
  const results = parseWhatnotShowImportCandidates(
    [
      {
        href: "https://www.whatnot.com/live/bf834262-79ee-4c70-8eb9-9da3eb5fe91b",
        title: "Currently live",
        dateText: "Live · 24",
      },
      {
        href: "https://www.whatnot.com/live/b3c1fa00-d863-4a0d-b475-85175d9395e6",
        title: "Tuesday show",
        dateText: "Tue 8:00 PM",
      },
      {
        href: "https://www.whatnot.com/live/67ee4237-425f-4578-ace6-e8bcd49cc913",
        title: "Saturday show",
        dateText: "Sat 8:00 PM",
      },
      {
        href: "https://www.whatnot.com/live/3ec90737-9d2b-4cfb-8d40-ac848d16f5d8",
        title: "Sunday Jul 12 show",
        dateText: "Sun, Jul 12, 8:00 PM",
      },
      {
        href: "https://www.whatnot.com/live/ca5fe015-6945-40f6-83e1-0b06e88aae74",
        title: "Sunday Aug 2 show",
        dateText: "Sun, Aug 2, 7:00 PM",
      },
    ],
    SATURDAY_NOON,
  );

  assert.equal(results.length, 5);
  assert.equal(results[0].status, "live");
  assert.equal(results[0].title, "Currently live");
  assert.equal(results[1].status, "ready");
  assert.equal(results[1].title, "Tuesday show");
  assert.equal(results[2].status, "ready");
  assert.equal(results[2].title, "Saturday show");
  assert.equal(results[3].status, "ready");
  assert.equal(results[3].title, "Sunday Jul 12 show");
  assert.equal(results[4].status, "ready");
  assert.equal(results[4].title, "Sunday Aug 2 show");

  const ids = results.map((entry) => entry.whatnotShowId);
  assert.deepEqual(ids, [
    "bf834262-79ee-4c70-8eb9-9da3eb5fe91b",
    "b3c1fa00-d863-4a0d-b475-85175d9395e6",
    "67ee4237-425f-4578-ace6-e8bcd49cc913",
    "3ec90737-9d2b-4cfb-8d40-ac848d16f5d8",
    "ca5fe015-6945-40f6-83e1-0b06e88aae74",
  ]);
});

test("parseWhatnotShowImportCandidates: maps an array without throwing on a mixed batch", () => {
  const results = parseWhatnotShowImportCandidates(
    [
      { href: "https://www.whatnot.com/live/bf834262-79ee-4c70-8eb9-9da3eb5fe91b", title: "Good", dateText: "Tue 8:00 PM" },
      { href: "not a url", title: "Bad", dateText: "Tue 8:00 PM" },
    ],
    SATURDAY_NOON,
  );

  assert.equal(results.length, 2);
  assert.equal(results[0].status, "ready");
  assert.equal(results[1].status, "needs_review");
});
