import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("Autonomous canonical catalog-copy persistence contract", () => {
  it("gates Ready on final catalog copy and writes the same fields atomically", () => {
    const source = readFileSync(
      path.join(root, "functions/src/ai/aiEnrichmentPipeline.ts"),
      "utf8",
    );
    assert.match(source, /resolveFinalCatalogCopy\(/);
    assert.ok((source.match(/resolveFinalCatalogCopy\(/g) ?? []).length >= 2);
    assert.match(source, /catalog\.automation\.final_catalog_gate/);
    assert.match(source, /reconciledFinalCatalogCopy\?\.valid/);
    assert.match(source, /title: reconciledFinalCatalogCopy\.title/);
    assert.match(source, /description: reconciledFinalCatalogCopy\.description/);
    assert.match(source, /categoryId: reconciledFinalCatalogCopy\.categoryId/);
    assert.match(source, /aiReviewedBy: "system:catalog-autonomy"/);
    assert.ok((source.match(/\.\.\.finalCatalogFields/g) ?? []).length >= 2);
    const branchStart = source.indexOf('if (mode === "ready_backfill")');
    const branchEnd = source.indexOf("return true;", branchStart);
    assert.ok(branchStart >= 0 && branchEnd > branchStart);
    assert.match(source.slice(branchStart, branchEnd), /\.\.\.finalCatalogFields/);
  });

  it("updates Automation Health only after guarded persistence", () => {
    const source = readFileSync(
      path.join(root, "functions/src/ai/aiEnrichmentPipeline.ts"),
      "utf8",
    );
    const persistenceIndex = source.indexOf("const persistenceResult = await markAiSuccess");
    const healthIndex = source.indexOf("await incrementCatalogAutomationHealth", persistenceIndex);
    assert.ok(persistenceIndex >= 0);
    assert.ok(healthIndex > persistenceIndex);
    assert.match(source, /catalogCopyHardBlockers/);
    assert.match(source, /catalogCopyDescriptionMissing/);
    assert.match(source, /catalogCopyCategoryUnresolved/);
    assert.match(source, /catalog\.automation\.health_write_failed/);
  });
});
