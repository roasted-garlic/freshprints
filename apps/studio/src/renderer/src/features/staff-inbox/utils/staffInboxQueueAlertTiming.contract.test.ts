import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

test("queue alert settle covers capacity celebration plus buffer", () => {
  const timing = readFileSync(join(here, "staffInboxQueueAlertTiming.ts"), "utf8");
  assert.match(timing, /SHOW_CAPACITY_BAR_ANIMATION_MS \+ 1_200/);
  assert.match(timing, /STAFF_INBOX_ALERT_BATCH_WINDOW_MS = 750/);
  assert.match(timing, /holdStaffInboxQueuedAlertGroup/);
  assert.match(timing, /isStaffInboxQueuedAlertGroupHeld/);
});

test("StaffInboxProvider uses settle window and hold gate for queued alerts", () => {
  const provider = readFileSync(join(here, "../components/StaffInboxProvider.tsx"), "utf8");
  assert.match(provider, /STAFF_INBOX_QUEUE_ALERT_SETTLE_MS/);
  assert.match(provider, /isStaffInboxQueuedAlertGroupHeld/);
  assert.match(provider, /STAFF_INBOX_QUEUE_ALERT_HOLD_CHANGED_EVENT/);
});

test("AddToShowModal holds inbox queue alerts until celebration completes", () => {
  const modal = readFileSync(
    join(here, "../../print-requests/components/AddToShowModal.tsx"),
    "utf8",
  );
  assert.match(modal, /holdStaffInboxQueuedAlertGroup/);
  assert.match(modal, /releaseAllStaffInboxQueuedAlertGroups/);
});
