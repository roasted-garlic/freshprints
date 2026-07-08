import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deprecatedDesignStatuses,
  designLibraryFilterStatuses,
  editableCatalogDesignStatuses,
  isWritableDesignStatus,
} from "../types/designStatus.types";
import { formatDesignStatusLabel } from "./designStatusDisplay";

describe("catalog design status model", () => {
  it("A. excludes deprecated statuses from library filters", () => {
    const filterValues = designLibraryFilterStatuses as readonly string[];

    for (const status of deprecatedDesignStatuses) {
      assert.equal(filterValues.includes(status), false);
    }

    assert.ok(filterValues.includes("imported"));
    assert.ok(filterValues.includes("ready"));
  });

  it("B. keeps editable catalog statuses empty for workflow-controlled lifecycle", () => {
    assert.equal(editableCatalogDesignStatuses.length, 0);
  });

  it("prevents new writes to deprecated statuses", () => {
    assert.equal(isWritableDesignStatus("ready"), true);
    assert.equal(isWritableDesignStatus("queued"), false);
    assert.equal(isWritableDesignStatus("printed"), false);
  });

  it("H. formats legacy statuses without crashing UI", () => {
    assert.equal(formatDesignStatusLabel("queued"), "Queued (legacy)");
    assert.equal(formatDesignStatusLabel("printed"), "Printed (legacy)");
  });
});
