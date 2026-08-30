import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolvePortalWorkingRequestBranch } from "./resolvePortalWorkingRequestBranch";

describe("resolvePortalWorkingRequestBranch", () => {
  it("uses explicit selection when multiple portal-editable requests exist", () => {
    assert.deepEqual(
      resolvePortalWorkingRequestBranch({
        portalEditableRequestIds: ["a", "b"],
        pendingWorkingRequestId: null,
        selectedWorkingRequestId: "b",
      }),
      { kind: "single", requestId: "b" },
    );
  });

  it("falls back to picker when multiple requests exist without a selection", () => {
    assert.deepEqual(
      resolvePortalWorkingRequestBranch({
        portalEditableRequestIds: ["a", "b"],
        pendingWorkingRequestId: null,
        selectedWorkingRequestId: null,
      }),
      { kind: "pick" },
    );
  });

  it("targets the only portal-editable request", () => {
    assert.deepEqual(
      resolvePortalWorkingRequestBranch({
        portalEditableRequestIds: ["only"],
        pendingWorkingRequestId: null,
        selectedWorkingRequestId: null,
      }),
      { kind: "single", requestId: "only" },
    );
  });
});
