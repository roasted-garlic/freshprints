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

test("Studio Print Requests label is Add to Show / Gang Sheet", () => {
  assert.match(pageSource, /Add to Show \/ Gang Sheet/);
});

test("AddToShowModal exposes Shows | Staff Gang Sheet destinations when not fixed", () => {
  assert.match(modalSource, /StudioDestinationTab/);
  assert.match(modalSource, /Staff Gang Sheet/);
  assert.match(modalSource, /No open Staff Gang Sheet/);
  assert.match(modalSource, /destinationTab === "shows"/);
});

test("AddToShowModal Staff tab does not auto-create and skips capacity split UI", () => {
  assert.doesNotMatch(modalSource, /createStaffGangSheetLane/);
  assert.match(modalSource, /isStaffDestination/);
  assert.match(modalSource, /Unlimited capacity/);
});
