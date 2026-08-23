import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const modalSource = readFileSync(path.join(here, "AddToShowModal.tsx"), "utf8");
const pageSource = readFileSync(
  path.join(here, "../pages/PrintRequestsPage.tsx"),
  "utf8",
);

test("Studio Print Requests splits Add to Show and Add to Internal Gangsheet", () => {
  assert.match(pageSource, /Add to Show/);
  assert.match(pageSource, /Add to Internal Gangsheet/);
  assert.doesNotMatch(pageSource, /Add to Show \/ Gang Sheet/);
  assert.match(pageSource, /destinationMode=\{addToShowDestination\}/);
});

test("AddToShowModal locks destination via destinationMode without requiring tabs", () => {
  assert.match(modalSource, /destinationMode\?:/);
  assert.match(modalSource, /showDestinationTabs/);
  assert.match(modalSource, /Internal Gangsheet/);
  assert.match(modalSource, /No open Internal Gangsheet/);
  assert.match(modalSource, /openStaffGangSheets/);
  assert.match(modalSource, /canConfirmFullFitDirectly/);
  assert.match(modalSource, /isInternal: printRequest\.isInternal/);
  assert.match(modalSource, /formatShowCapacitySlotLabel/);
});

test("AddToShowModal Staff destination does not auto-create and shows capacity UI", () => {
  assert.doesNotMatch(modalSource, /createStaffGangSheetLane/);
  assert.match(modalSource, /isStaffDestination/);
  assert.match(modalSource, /formatShowCapacitySlotLabel/);
  assert.match(modalSource, /AnimatedShowCapacityBar/);
  assert.match(modalSource, /staffCapacityPresentation/);
  assert.match(modalSource, /savePendingByShowId/);
});
