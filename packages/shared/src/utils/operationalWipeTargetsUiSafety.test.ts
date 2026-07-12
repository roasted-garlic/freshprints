import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyOperationalWipeTargetToggle,
  ALL_OPERATIONAL_WIPE_TARGETS,
  expandOperationalWipePlan,
} from "./operationalWipeTargets";

describe("operationalWipeTargets UI safety", () => {
  it("toggles customerUploads without throwing", () => {
    const withUploads = applyOperationalWipeTargetToggle([], "customerUploads", true);
    assert.deepEqual(withUploads, ["customerUploads"]);
    const cleared = applyOperationalWipeTargetToggle(withUploads, "customerUploads", false);
    assert.deepEqual(cleared, []);
  });

  it("select-all includes customerUploads and expands storage wipe", () => {
    assert.ok(ALL_OPERATIONAL_WIPE_TARGETS.includes("customerUploads"));
    const plan = expandOperationalWipePlan(ALL_OPERATIONAL_WIPE_TARGETS);
    assert.equal(plan.wipeCustomerUploadStorage, true);
    assert.ok(plan.deleteCollections.includes("customerUploads"));
    assert.ok(plan.deleteCollections.includes("staffInboxAlertDeliveries"));
  });

  it("captures checkbox checked before setState updater", () => {
    // Mirrors TestDataResetPage: reading event.currentTarget inside the updater can throw.
    let checkedCapture: boolean | null = null;
    const fakeEvent = {
      currentTarget: { checked: true },
    };
    checkedCapture = fakeEvent.currentTarget.checked;
    const next = applyOperationalWipeTargetToggle([], "customerUploads", checkedCapture);
    assert.deepEqual(next, ["customerUploads"]);
  });
});
