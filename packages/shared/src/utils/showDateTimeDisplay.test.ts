import assert from "node:assert/strict";
import { test } from "node:test";

import { formatShowDateTimeLabel, formatShowTimeOnlyLabel } from "./showDateTimeDisplay";

test("formatShowDateTimeLabel: does not include seconds", () => {
  const label = formatShowDateTimeLabel(new Date(2026, 6, 4, 14, 30, 45));
  assert.ok(!/:\d{2}:\d{2}/.test(label), `expected no seconds in "${label}"`);
});

test("formatShowTimeOnlyLabel: does not include seconds", () => {
  const label = formatShowTimeOnlyLabel(new Date(2026, 6, 4, 14, 30, 45));
  assert.ok(!/:\d{2}:\d{2}/.test(label), `expected no seconds in "${label}"`);
});
