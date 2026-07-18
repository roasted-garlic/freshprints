import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ASSISTED_CREATION_OPEN_STATUSES,
  ASSISTED_CREATION_TERMINAL_STATUSES,
  canSendAssistedCreationMessage,
  filterAssistedCreationTerminalRequests,
  isAssistedCreationTerminalStatus,
  type AssistedCreationStatus,
} from "./assistedCreation.constants";

describe("canSendAssistedCreationMessage", () => {
  it("returns true for every open status", () => {
    for (const status of ASSISTED_CREATION_OPEN_STATUSES) {
      assert.equal(canSendAssistedCreationMessage(status), true, status);
    }
  });

  it("returns false for every terminal status", () => {
    for (const status of ASSISTED_CREATION_TERMINAL_STATUSES) {
      assert.equal(canSendAssistedCreationMessage(status), false, status);
    }
  });
});

describe("isAssistedCreationTerminalStatus", () => {
  it("returns false for every open status", () => {
    for (const status of ASSISTED_CREATION_OPEN_STATUSES) {
      assert.equal(isAssistedCreationTerminalStatus(status), false, status);
    }
  });

  it("returns true for approved, rejected, and cancelled", () => {
    for (const status of ASSISTED_CREATION_TERMINAL_STATUSES) {
      assert.equal(isAssistedCreationTerminalStatus(status), true, status);
    }
  });
});

describe("filterAssistedCreationTerminalRequests", () => {
  it("keeps only terminal requests and preserves order", () => {
    const requests: Array<{ id: string; status: AssistedCreationStatus }> = [
      { id: "1", status: "submitted" },
      { id: "2", status: "approved" },
      { id: "3", status: "in_progress" },
      { id: "4", status: "rejected" },
      { id: "5", status: "proof_ready" },
      { id: "6", status: "revision_requested" },
      { id: "7", status: "cancelled" },
    ];

    assert.deepEqual(filterAssistedCreationTerminalRequests(requests), [
      { id: "2", status: "approved" },
      { id: "4", status: "rejected" },
      { id: "7", status: "cancelled" },
    ]);
  });

  it("returns an empty list when there are no terminal requests", () => {
    const requests: Array<{ id: string; status: AssistedCreationStatus }> = [
      { id: "1", status: "submitted" },
      { id: "2", status: "proof_ready" },
    ];
    assert.deepEqual(filterAssistedCreationTerminalRequests(requests), []);
  });
});
