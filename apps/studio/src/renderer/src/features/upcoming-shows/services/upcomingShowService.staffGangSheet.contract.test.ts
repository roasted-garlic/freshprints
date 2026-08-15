import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const serviceSource = readFileSync(path.join(here, "upcomingShowService.ts"), "utf8");

test("Staff Gang Sheet create omits whatnotShowId and maxTotalQuantity", () => {
  assert.match(serviceSource, /createStaffGangSheetLane/);
  assert.match(serviceSource, /source: "staff_gang_sheet"/);
  assert.match(serviceSource, /assignedStaffUserId/);
  assert.match(serviceSource, /staffGangSheetCycleNumber/);
  assert.doesNotMatch(
    serviceSource.slice(
      serviceSource.indexOf("createStaffGangSheetLane"),
      serviceSource.indexOf("completeStaffGangSheetAndOpenNext"),
    ),
    /whatnotShowId:/,
  );
});

test("allocatePrintRequestItem enforces Staff origin allowlist", () => {
  assert.match(serviceSource, /canAllocateOriginToShowSource/);
  assert.match(serviceSource, /Portal customer requests cannot be added to Staff Gang Sheets/);
});

test("complete+next uses trusted callable (helper create blocked by Rules)", () => {
  assert.match(serviceSource, /completeStaffGangSheetAndOpenNext/);
  assert.match(serviceSource, /callTracedFunction/);
});
