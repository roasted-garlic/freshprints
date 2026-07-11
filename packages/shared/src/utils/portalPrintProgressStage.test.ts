import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getPortalPrintProgressStageLabel,
  resolvePortalPrintProgressStage,
} from "./portalPrintProgressStage";

describe("resolvePortalPrintProgressStage", () => {
  it("hides the rail for working requests", () => {
    assert.equal(resolvePortalPrintProgressStage("working"), null);
  });

  it("maps list tabs to Queued / Printing / Done", () => {
    assert.equal(resolvePortalPrintProgressStage("queued"), "queued");
    assert.equal(resolvePortalPrintProgressStage("printing"), "printing");
    assert.equal(resolvePortalPrintProgressStage("printed"), "done");
  });
});

describe("getPortalPrintProgressStageLabel", () => {
  it("returns customer-facing labels", () => {
    assert.equal(getPortalPrintProgressStageLabel("queued"), "Queued");
    assert.equal(getPortalPrintProgressStageLabel("printing"), "Printing");
    assert.equal(getPortalPrintProgressStageLabel("done"), "Done");
  });
});
