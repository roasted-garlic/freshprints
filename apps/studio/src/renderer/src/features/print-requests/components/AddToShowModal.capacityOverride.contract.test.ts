import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const modalSource = readFileSync(path.join(here, "AddToShowModal.tsx"), "utf8");
const serviceSource = readFileSync(
  path.join(here, "../../upcoming-shows/services/upcomingShowService.ts"),
  "utf8",
);

test("AddToShowModal offers Allocate Anyway with Cancel that does not submit", () => {
  assert.match(modalSource, /Allocate Anyway/);
  assert.match(modalSource, /setIsCapacityOverrideConfirmOpen\(true\)/);
  assert.match(modalSource, /setIsCapacityOverrideConfirmOpen\(false\)/);
  assert.match(modalSource, /handleConfirm\(\{ overrideShowCapacity: true \}\)/);
  assert.match(modalSource, /Allocate over capacity\?/);
  assert.match(modalSource, /configured max stays/);
});

test("Allocate Anyway submits full remainder with overrideShowCapacity true only", () => {
  assert.match(modalSource, /overrideShowCapacity \? \{ overrideShowCapacity: true \} : \{\}/);
  assert.match(modalSource, /canConfirmFullFitDirectly \|\| overrideShowCapacity/);
  assert.match(modalSource, /allowCapacityFullOverride: true/);
  assert.match(serviceSource, /overrideShowCapacity\?: boolean/);
  assert.match(
    serviceSource,
    /\.\.\.\(input\.overrideShowCapacity === true \? \{ overrideShowCapacity: true \} : \{\}\)/,
  );
});

test("Split picker copy points at Allocate Anyway", () => {
  const pickerSource = readFileSync(path.join(here, "SplitDesignPickerModal.tsx"), "utf8");
  assert.match(pickerSource, /Allocate\s+Anyway on the previous step/);
});
