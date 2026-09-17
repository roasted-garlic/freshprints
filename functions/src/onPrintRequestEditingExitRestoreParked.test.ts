import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldRestoreParkedDraftOnEditingExit } from "./onPrintRequestEditingExitRestoreParked";

describe("shouldRestoreParkedDraftOnEditingExit", () => {
  it("restores when editing exits even if parksDraftPrintRequestId was cleared in the same write", () => {
    assert.equal(
      shouldRestoreParkedDraftOnEditingExit({
        beforeStatus: "editing",
        afterStatus: "active",
        beforeParkedDraftId: "parked-working-1",
      }),
      true,
    );
  });

  it("does not restore when there was no parked draft pointer", () => {
    assert.equal(
      shouldRestoreParkedDraftOnEditingExit({
        beforeStatus: "editing",
        afterStatus: "active",
        beforeParkedDraftId: undefined,
      }),
      false,
    );
  });

  it("does not restore when status did not leave editing", () => {
    assert.equal(
      shouldRestoreParkedDraftOnEditingExit({
        beforeStatus: "editing",
        afterStatus: "editing",
        beforeParkedDraftId: "parked-working-1",
      }),
      false,
    );
  });
});
