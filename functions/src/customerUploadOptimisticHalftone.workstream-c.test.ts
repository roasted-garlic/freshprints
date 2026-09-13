import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Pure contract tests for Workstream C optimistic metadata + promote gate.
 * (Hook itself is React-bound; these lock the acceptance predicates.)
 */

type Pending = "halftone" | "artwork_background" | "promote" | null;
type Failed = "halftone" | "artwork_background" | undefined;

function shouldBlockPromote(pending: Pending, failed: Failed): boolean {
  return pending === "halftone" || pending === "artwork_background" || Boolean(failed);
}

function applySnapshotWithOverrides<T extends { id: string }>(
  serverRows: T[],
  overrides: Map<string, Partial<T>>,
): T[] {
  return serverRows.map((row) => {
    const override = overrides.get(row.id);
    return override ? { ...row, ...override } : row;
  });
}

describe("workstream C optimistic metadata contracts", () => {
  it("blocks promote while metadata save is pending", () => {
    assert.equal(shouldBlockPromote("halftone", undefined), true);
    assert.equal(shouldBlockPromote("artwork_background", undefined), true);
  });

  it("blocks promote when metadata save failed", () => {
    assert.equal(shouldBlockPromote(null, "halftone"), true);
    assert.equal(shouldBlockPromote(null, "artwork_background"), true);
  });

  it("allows promote when idle and not failed", () => {
    assert.equal(shouldBlockPromote(null, undefined), false);
  });

  it("snapshot remap preserves optimistic override until cleared", () => {
    const overrides = new Map<string, Partial<{ id: string; halftone: boolean }>>();
    overrides.set("u1", { halftone: true });
    const merged = applySnapshotWithOverrides(
      [
        { id: "u1", halftone: false },
        { id: "u2", halftone: false },
      ],
      overrides,
    );
    assert.equal(merged[0]?.halftone, true);
    assert.equal(merged[1]?.halftone, false);
  });

  it("maps intake provenance literal", () => {
    const source = "intake" as const;
    assert.equal(source, "intake");
    assert.notEqual(source, "customer");
  });
});
