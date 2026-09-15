import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isShowEligibleForDefaultMaxApply,
  shouldSkipDefaultMaxApplyForAllocatedQuantity,
} from "./showQueueDefaultMaxApplyEligibility";

function timestamp(iso: string) {
  const date = new Date(iso);
  return { toDate: () => date };
}

describe("isShowEligibleForDefaultMaxApply", () => {
  const now = new Date("2026-09-15T12:00:00Z");

  it("includes upcoming open/full/printing whatnot and dev_fixture shows", () => {
    for (const productionStatus of ["open", "full", "printing"] as const) {
      for (const source of ["whatnot", "dev_fixture"] as const) {
        assert.equal(
          isShowEligibleForDefaultMaxApply(
            {
              source,
              productionStatus,
              scheduledStartAt: timestamp("2026-10-01T00:00:00Z"),
              allocatedQuantity: 10,
              maxTotalQuantity: 50,
            },
            now,
          ),
          true,
          `${source}/${productionStatus}`,
        );
      }
    }
  });

  it("excludes past schedule shows including unresolved past printing", () => {
    assert.equal(
      isShowEligibleForDefaultMaxApply(
        {
          source: "whatnot",
          productionStatus: "printing",
          scheduledStartAt: timestamp("2026-08-01T00:00:00Z"),
        },
        now,
      ),
      false,
    );
  });

  it("excludes terminal production statuses", () => {
    for (const productionStatus of ["completed", "fully_printed", "archived", "canceled"] as const) {
      assert.equal(
        isShowEligibleForDefaultMaxApply(
          {
            source: "whatnot",
            productionStatus,
            scheduledStartAt: timestamp("2026-10-01T00:00:00Z"),
          },
          now,
        ),
        false,
        productionStatus,
      );
    }
  });

  it("excludes staff_gang_sheet even when upcoming and open", () => {
    assert.equal(
      isShowEligibleForDefaultMaxApply(
        {
          source: "staff_gang_sheet",
          productionStatus: "open",
          scheduledStartAt: timestamp("2026-10-01T00:00:00Z"),
        },
        now,
      ),
      false,
    );
  });

  it("excludes archived flag", () => {
    assert.equal(
      isShowEligibleForDefaultMaxApply(
        {
          source: "whatnot",
          productionStatus: "open",
          isArchived: true,
          scheduledStartAt: timestamp("2026-10-01T00:00:00Z"),
        },
        now,
      ),
      false,
    );
  });
});

describe("shouldSkipDefaultMaxApplyForAllocatedQuantity", () => {
  it("skips when finite new max is below allocated", () => {
    assert.equal(
      shouldSkipDefaultMaxApplyForAllocatedQuantity({ allocatedQuantity: 40 }, 30),
      true,
    );
  });

  it("does not skip when new max equals or exceeds allocated", () => {
    assert.equal(
      shouldSkipDefaultMaxApplyForAllocatedQuantity({ allocatedQuantity: 40 }, 40),
      false,
    );
    assert.equal(
      shouldSkipDefaultMaxApplyForAllocatedQuantity({ allocatedQuantity: 40 }, 50),
      false,
    );
  });

  it("does not skip when clearing to no limit", () => {
    assert.equal(
      shouldSkipDefaultMaxApplyForAllocatedQuantity({ allocatedQuantity: 40 }, null),
      false,
    );
  });
});
