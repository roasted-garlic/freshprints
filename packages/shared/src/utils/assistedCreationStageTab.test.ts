import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ASSISTED_CREATION_OPEN_STATUSES,
  ASSISTED_CREATION_TERMINAL_STATUSES,
  type AssistedCreationStatus,
} from "../constants/assistedCreation/assistedCreation.constants";
import {
  stageForAssistedCreationStatus,
  statusesForAssistedCreationStageTab,
} from "./assistedCreationStageTab";

describe("stageForAssistedCreationStatus", () => {
  it("maps each open and terminal status to the expected Studio tab", () => {
    const expected: Record<AssistedCreationStatus, string> = {
      submitted: "new",
      in_progress: "in_progress",
      revision_requested: "revisions",
      proof_ready: "proof_ready",
      final_source_needed: "final_source_needed",
      approved: "completed",
      rejected: "completed",
      cancelled: "completed",
    };
    for (const status of Object.keys(expected) as AssistedCreationStatus[]) {
      assert.equal(stageForAssistedCreationStatus(status), expected[status], status);
    }
  });

  it("covers every open and terminal status constant", () => {
    for (const status of [...ASSISTED_CREATION_OPEN_STATUSES, ...ASSISTED_CREATION_TERMINAL_STATUSES]) {
      assert.ok(stageForAssistedCreationStatus(status));
    }
  });

  it("keeps final_source_needed on its own tab, not completed", () => {
    assert.equal(stageForAssistedCreationStatus("final_source_needed"), "final_source_needed");
    assert.deepEqual(statusesForAssistedCreationStageTab("final_source_needed"), [
      "final_source_needed",
    ]);
  });
});
