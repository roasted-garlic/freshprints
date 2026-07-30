import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  advancePortalPrintProgressStage,
  resolvePortalMountedProgressAuthority,
  resolveLiveShowProgressStage,
} from "./portalPrintProgressStage";

describe("portal mounted progress stage", () => {
  it("advances queued to printing to done from live state", () => {
    const printing = advancePortalPrintProgressStage("queued", "queued", "printing");
    assert.equal(printing, "printing");
    assert.equal(advancePortalPrintProgressStage(printing, "queued", "completed"), "done");
  });

  it("never regresses a per-request terminal or printing watermark", () => {
    assert.equal(advancePortalPrintProgressStage("done", "queued", "open"), "done");
    assert.equal(advancePortalPrintProgressStage("printing", "queued", "open"), "printing");
  });

  it("maps only live production lifecycle states", () => {
    assert.equal(resolveLiveShowProgressStage("fully_printed"), "done");
    assert.equal(resolveLiveShowProgressStage("printing"), "printing");
    assert.equal(resolveLiveShowProgressStage("open"), null);
  });

  it("composes chip/rail stage with the same effective-terminal polling authority", () => {
    const queued = resolvePortalMountedProgressAuthority(null, "queued", null);
    const printing = resolvePortalMountedProgressAuthority(queued.stage, "queued", "printing");
    const done = resolvePortalMountedProgressAuthority(printing.stage, "queued", "completed");
    const staleAfterDone = resolvePortalMountedProgressAuthority(done.stage, "queued", "open");
    assert.deepEqual(
      [queued, printing, done, staleAfterDone],
      [
        { stage: "queued", pollingEnabled: true },
        { stage: "printing", pollingEnabled: true },
        { stage: "done", pollingEnabled: false },
        { stage: "done", pollingEnabled: false },
      ],
    );
  });
});
