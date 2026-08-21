import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolvePrintRequestItemPersistenceHealth,
  summarizePrintRequestPersistenceHealth,
} from "./printRequestItemPersistenceHealth";

describe("resolvePrintRequestItemPersistenceHealth", () => {
  const base = {
    isOptimistic: false,
    isSaving: false,
    isFailed: false,
    isDirty: false,
    canSave: true,
  };

  it("reports optimistic first", () => {
    assert.equal(
      resolvePrintRequestItemPersistenceHealth({ ...base, isOptimistic: true, isDirty: true }),
      "optimistic",
    );
  });

  it("reports saving before dirty-valid", () => {
    assert.equal(
      resolvePrintRequestItemPersistenceHealth({ ...base, isSaving: true, isDirty: true }),
      "saving",
    );
  });

  it("reports failed, dirty_invalid, dirty_valid, and clean", () => {
    assert.equal(
      resolvePrintRequestItemPersistenceHealth({ ...base, isFailed: true }),
      "failed",
    );
    assert.equal(
      resolvePrintRequestItemPersistenceHealth({ ...base, isDirty: true, canSave: false }),
      "dirty_invalid",
    );
    assert.equal(
      resolvePrintRequestItemPersistenceHealth({ ...base, isDirty: true, canSave: true }),
      "dirty_valid",
    );
    assert.equal(resolvePrintRequestItemPersistenceHealth(base), "clean");
  });
});

describe("summarizePrintRequestPersistenceHealth", () => {
  it("blocks invalid, failed, optimistic, and saving", () => {
    assert.equal(
      summarizePrintRequestPersistenceHealth({ a: "dirty_invalid" }).canOpenQueue,
      false,
    );
    assert.equal(summarizePrintRequestPersistenceHealth({ a: "failed" }).canOpenQueue, false);
    assert.equal(summarizePrintRequestPersistenceHealth({ a: "optimistic" }).canOpenQueue, false);
    assert.equal(summarizePrintRequestPersistenceHealth({ a: "saving" }).canOpenQueue, false);
  });

  it("allows a flush of dirty-valid items", () => {
    const summary = summarizePrintRequestPersistenceHealth({ a: "dirty_valid", b: "clean" });
    assert.equal(summary.canOpenQueue, true);
    assert.equal(summary.needsFlush, true);
  });

  it("allows a fully clean set", () => {
    const summary = summarizePrintRequestPersistenceHealth({ a: "clean" });
    assert.equal(summary.canOpenQueue, true);
    assert.equal(summary.needsFlush, false);
    assert.equal(summary.blockReason, null);
  });
});
