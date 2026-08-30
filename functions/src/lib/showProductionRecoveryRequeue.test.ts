import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildShowProductionRecoveryPreviewChecksum,
  verifyShowProductionRecoveryPreviewChecksum,
} from "../../../packages/shared/src/utils/showProductionRecoveryRequeue";

const here = path.dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(path.join(here, rel), "utf8");
}

test("requeue apply module verifies preview checksum before mutation", () => {
  const source = read("showProductionRecoveryRequeue.ts");
  assert.match(source, /verifyShowProductionRecoveryPreviewChecksum/);
  assert.match(source, /previewChecksum/);
  assert.match(source, /showProductionRecoveryApplications/);
});

test("requeue apply clones allocations with requeuedFromAllocationId", () => {
  const source = read("showProductionRecoveryRequeue.ts");
  assert.match(source, /requeuedFromAllocationId/);
  assert.match(source, /cloneAllocationForRequeue/);
});

test("preview checksum validation rejects stale apply payloads", () => {
  const input = {
    upcomingShowId: "source-show",
    action: "requeue_unfulfilled",
    targetUpcomingShowId: "target-show",
    sourceProductionStatus: "open",
    predictedResolutionKind: "unfulfilled_requeue" as const,
    sourceAllocations: [
      {
        id: "alloc-1",
        upcomingShowId: "source-show",
        printRequestId: "request-1",
        allocatedQuantity: 2,
        status: "queued",
      },
    ],
    targetShow: {
      id: "target-show",
      maxTotalQuantity: 100,
      allocatedQuantity: 5,
    },
  };

  const checksum = buildShowProductionRecoveryPreviewChecksum(input);
  assert.equal(verifyShowProductionRecoveryPreviewChecksum(checksum, input), true);
  assert.equal(
    verifyShowProductionRecoveryPreviewChecksum(checksum, {
      ...input,
      sourceAllocations: [
        {
          ...input.sourceAllocations[0]!,
          allocatedQuantity: 3,
        },
      ],
    }),
    false,
  );
});

test("recovery lib branches requeue apply to dedicated handler", () => {
  const source = read("showProductionRecovery.ts");
  assert.match(source, /applyRequeueUnfulfilledRecovery/);
  assert.match(source, /buildRequeuePreviewSection/);
  assert.match(source, /buildNeedsStaffRequeuePatch/);
});

test("requeue preview split warning excludes planned destination rows from other-show detection", () => {
  const recoverySource = read("showProductionRecovery.ts");
  assert.match(
    recoverySource,
    /Requeue preview must not treat planned destination replacements as pre-existing other-show work/,
  );
  assert.match(
    recoverySource,
    /action === "requeue_unfulfilled" \? simulatedAllocations : simulatedWithTarget/,
  );
  assert.match(
    recoverySource,
    /requeueSection\?\.requeueLines\?\.some\(\(line\) => line\.otherShowAllocationQuantity > 0\)/,
  );

  const requeueSource = read("showProductionRecoveryRequeue.ts");
  assert.match(requeueSource, /loadAllocationSnapshotsForRequeueLines/);
});

test("callable accepts requeue_unfulfilled and preview checksum", () => {
  const source = read("../previewShowProductionRecovery.ts");
  assert.match(source, /requeue_unfulfilled/);
  assert.match(source, /parsePreviewChecksum/);
  assert.match(source, /parseTargetUpcomingShowId/);
});
