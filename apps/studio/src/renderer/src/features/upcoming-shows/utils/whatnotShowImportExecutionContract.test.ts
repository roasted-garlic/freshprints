import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const hookSource = readFileSync(
  new URL("../hooks/useWhatnotShowImport.ts", import.meta.url),
  "utf8",
);
const serviceSource = readFileSync(
  new URL("../services/upcomingShowService.ts", import.meta.url),
  "utf8",
);

test("update execution uses scanner-matched document identity and never falls back to create", () => {
  const updateBranch = hookSource.match(
    /if \(entry\.action === "update"\) \{([\s\S]*?)\} else \{([\s\S]*?)\n\s*\}/,
  );
  assert.ok(updateBranch, "expected explicit update/create execution branches");
  assert.match(updateBranch[1], /updateUpcomingShowFromWhatnotImport/);
  assert.match(updateBranch[1], /existingShowId: entry\.existingShowId/);
  assert.doesNotMatch(updateBranch[1], /upsertUpcomingShow/);
  assert.match(updateBranch[2], /upsertUpcomingShow/);
});

test("unchanged candidates remain no-op before all write branches", () => {
  const unchangedIndex = hookSource.indexOf('entry.action === "unchanged"');
  const writeIndex = hookSource.indexOf("updateUpcomingShowFromWhatnotImport");
  assert.ok(unchangedIndex >= 0 && unchangedIndex < writeIndex);
  assert.match(hookSource.slice(unchangedIndex, writeIndex), /continue;/);
});

test("dedicated update reads and writes the exact matched document without strict post-write remapping", () => {
  const method = serviceSource.match(
    /async updateUpcomingShowFromWhatnotImport\(([\s\S]*?)\n\s*async updateUpcomingShow\(/,
  );
  assert.ok(method, "expected dedicated Whatnot update method");
  assert.match(method[1], /doc\(firestoreCollectionService\.getUpcomingShowsCollection\(\), targetId\)/);
  assert.match(method[1], /getDoc\(showRef\)/);
  assert.match(method[1], /updateDoc\(showRef, updatePayload\)/);
  assert.doesNotMatch(method[1], /setDoc|upsertUpcomingShow|getUpcomingShowById|listUpcomingShows/);
});
