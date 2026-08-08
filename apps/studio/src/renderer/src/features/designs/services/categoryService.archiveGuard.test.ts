import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

describe("Amendment 2 — categoryService.archiveCategory design-ref guard", () => {
  it("counts referencing designs before setting isActive false", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/services/categoryService.ts",
    );
    const start = source.indexOf("async archiveCategory(");
    const end = source.indexOf("async restoreCategory(");
    const block = source.slice(start, end);
    assert.match(block, /getCountFromServer/);
    assert.match(block, /where\("categoryId", "==", categoryId\)/);
    assert.match(block, /referencingDesignCount > 0/);
    assert.match(block, /cannot be archived while/);
    assert.match(block, /isActive: false/);
  });

  it("Function assertOwnerAdmin allows owner and admin (source; deploy deferred)", () => {
    const source = read("functions/src/archiveTaxonomyWithGuards.ts");
    assert.match(source, /role !== "owner" && caller\.role !== "admin"/);
    assert.match(source, /Only owners and admins can archive/);
  });
});
