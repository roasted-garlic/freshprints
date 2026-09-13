import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canPublishAutonomously,
  resolveCatalogAutonomousLiveEnabled,
  resolveCatalogWorkflowMode,
} from "../constants/catalogWorkflowMode.constants";

describe("resolveCatalogWorkflowMode", () => {
  it("defaults missing to manual", () => {
    assert.equal(resolveCatalogWorkflowMode(undefined), "manual");
    assert.equal(resolveCatalogWorkflowMode(null), "manual");
  });

  it("defaults malformed to manual", () => {
    assert.equal(resolveCatalogWorkflowMode("AUTO"), "manual");
    assert.equal(resolveCatalogWorkflowMode(123), "manual");
    assert.equal(resolveCatalogWorkflowMode({}), "manual");
  });

  it("accepts valid modes", () => {
    assert.equal(resolveCatalogWorkflowMode("manual"), "manual");
    assert.equal(resolveCatalogWorkflowMode("shadow"), "shadow");
    assert.equal(resolveCatalogWorkflowMode("autonomous"), "autonomous");
  });

  it("never fail-opens live publish without both gates", () => {
    assert.equal(
      canPublishAutonomously({
        catalogWorkflowMode: "autonomous",
        catalogAutonomousLiveEnabled: false,
      }),
      false,
    );
    assert.equal(
      canPublishAutonomously({
        catalogWorkflowMode: "shadow",
        catalogAutonomousLiveEnabled: true,
      }),
      false,
    );
    assert.equal(resolveCatalogAutonomousLiveEnabled(undefined), false);
    assert.equal(resolveCatalogAutonomousLiveEnabled("true"), false);
    assert.equal(resolveCatalogAutonomousLiveEnabled(true), true);
  });
});
