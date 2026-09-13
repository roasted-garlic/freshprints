import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolvePortalWorkingRequestBranch } from "./resolvePortalWorkingRequestBranch";

describe("resolvePortalWorkingRequestBranch", () => {
  it("uses explicit selection when multiple active-editable requests exist", () => {
    assert.deepEqual(
      resolvePortalWorkingRequestBranch({
        activeEditableRequestIds: ["a", "b"],
        pendingWorkingRequestId: null,
        selectedWorkingRequestId: "b",
      }),
      { kind: "single", requestId: "b" },
    );
  });

  it("fails closed when multiple actives exist without a unique Editing owner", () => {
    assert.deepEqual(
      resolvePortalWorkingRequestBranch({
        activeEditableRequestIds: ["a", "b"],
        pendingWorkingRequestId: null,
        selectedWorkingRequestId: null,
      }),
      { kind: "conflict" },
    );
  });

  it("auto-targets the unique Editing request among multiple actives", () => {
    assert.deepEqual(
      resolvePortalWorkingRequestBranch({
        activeEditableRequestIds: ["draft-a", "editing-b"],
        activeEditableStatusesById: {
          "draft-a": "draft",
          "editing-b": "editing",
        },
        pendingWorkingRequestId: null,
        selectedWorkingRequestId: null,
      }),
      { kind: "single", requestId: "editing-b" },
    );
  });

  it("targets the only active-editable request", () => {
    assert.deepEqual(
      resolvePortalWorkingRequestBranch({
        activeEditableRequestIds: ["only"],
        pendingWorkingRequestId: null,
        selectedWorkingRequestId: null,
      }),
      { kind: "single", requestId: "only" },
    );
  });

  it("ignores selected id that is not in the active-editable set (e.g. parked)", () => {
    assert.deepEqual(
      resolvePortalWorkingRequestBranch({
        activeEditableRequestIds: ["editing-b"],
        activeEditableStatusesById: { "editing-b": "editing" },
        pendingWorkingRequestId: null,
        selectedWorkingRequestId: "parked-a",
      }),
      { kind: "single", requestId: "editing-b" },
    );
  });
});
