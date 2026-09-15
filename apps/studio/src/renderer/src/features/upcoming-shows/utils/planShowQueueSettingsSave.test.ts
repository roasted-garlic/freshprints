import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  formatApplyDefaultMaxSuccessMessage,
  planShowQueueSettingsSave,
} from "./planShowQueueSettingsSave";

describe("planShowQueueSettingsSave", () => {
  it("unchecked save includes defaultMax on the client path and does not invoke apply", () => {
    const plan = planShowQueueSettingsSave({
      applyToExistingShows: false,
      defaultMaxTotalQuantity: 90,
      whatnotShowBaseUrl: "https://www.whatnot.com/user/x/shows",
      portalQueueCutoffHoursBeforeStart: 5,
    });

    assert.equal(plan.invokeApplyCallable, false);
    assert.equal(plan.applyPayload, undefined);
    assert.equal(plan.clientSettingsUpdate.defaultMaxTotalQuantity, 90);
    assert.equal(plan.clientSettingsUpdate.portalQueueCutoffHoursBeforeStart, 5);
  });

  it("checked save omits defaultMax from client path and invokes apply callable", () => {
    const plan = planShowQueueSettingsSave({
      applyToExistingShows: true,
      defaultMaxTotalQuantity: 90,
      whatnotShowBaseUrl: undefined,
      portalQueueCutoffHoursBeforeStart: 5,
    });

    assert.equal(plan.invokeApplyCallable, true);
    assert.deepEqual(plan.applyPayload, { defaultMaxTotalQuantity: 90 });
    assert.equal("defaultMaxTotalQuantity" in plan.clientSettingsUpdate, false);
  });

  it("checked blank default plans a clear (null) apply payload", () => {
    const plan = planShowQueueSettingsSave({
      applyToExistingShows: true,
      defaultMaxTotalQuantity: undefined,
      whatnotShowBaseUrl: undefined,
      portalQueueCutoffHoursBeforeStart: 5,
    });

    assert.deepEqual(plan.applyPayload, { defaultMaxTotalQuantity: null });
  });
});

describe("formatApplyDefaultMaxSuccessMessage", () => {
  it("reports updated and skipped counts", () => {
    assert.match(
      formatApplyDefaultMaxSuccessMessage({ updatedShowCount: 12, skippedBelowAllocatedCount: 0 }),
      /updated 12 existing shows/i,
    );
    assert.match(
      formatApplyDefaultMaxSuccessMessage({ updatedShowCount: 0, skippedBelowAllocatedCount: 0 }),
      /No eligible existing shows/i,
    );
    assert.match(
      formatApplyDefaultMaxSuccessMessage({ updatedShowCount: 2, skippedBelowAllocatedCount: 1 }),
      /Skipped 1 show/i,
    );
  });
});

describe("UpcomingShowsPage apply wiring contract", () => {
  it("uses the save planner and only invokes apply when planned", () => {
    const pagePath = join(dirname(fileURLToPath(import.meta.url)), "../pages/UpcomingShowsPage.tsx");
    const source = readFileSync(pagePath, "utf8");
    assert.match(source, /planShowQueueSettingsSave/);
    assert.match(source, /invokeApplyCallable/);
    assert.match(source, /applyDefaultMaxToEligibleShows/);
    assert.match(source, /applyToExistingShows/);
  });
});
