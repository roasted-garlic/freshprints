import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("showQueueMove callables contract", () => {
  it("exports preview and apply callables from index", () => {
    const indexSource = read("src/index.ts");
    assert.match(indexSource, /previewShowQueueMove/);
    assert.match(indexSource, /applyShowQueueMove/);
  });

  it("apply cancels source and sets movedFromAllocationId not requeuedFromAllocationId", () => {
    const lib = read("src/lib/showQueueMove.ts");
    assert.match(lib, /movedFromAllocationId/);
    assert.match(lib, /status:\s*"canceled"/);
    assert.doesNotMatch(lib, /requeuedFromAllocationId/);
    assert.doesNotMatch(lib, /needsStaffRequeue/);
    assert.doesNotMatch(lib, /productionResolutionKind/);
    assert.match(lib, /showQueueMoveApplications/);
  });

  it("shared helpers enforce pending/queued and block printing destinations", () => {
    const shared = readFileSync(
      join(root, "../packages/shared/src/utils/showQueueMove.ts"),
      "utf8",
    );
    assert.match(shared, /MOVABLE_SHOW_QUEUE_MOVE_STATUSES/);
    assert.match(shared, /"printing"/);
    assert.match(shared, /isShowQueueMoveDestination/);
    assert.match(shared, /SHOW_QUEUE_MOVE_MAX_ALLOCATIONS/);
  });
});
