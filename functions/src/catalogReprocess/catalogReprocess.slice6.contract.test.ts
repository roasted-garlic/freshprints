import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("catalogReprocess Slice 6 Ready preservation contracts", () => {
  it("worker supports ready_catalog and ready_lifecycle_violation", () => {
    const worker = readFileSync(join(here, "catalogReprocessWorker.ts"), "utf8");
    assert.match(worker, /processReadyCatalogUnit/);
    assert.match(worker, /ready_lifecycle_violation/);
    assert.match(worker, /buildReadyCatalogReprocessAiStageUpdate/);
    assert.match(worker, /mode: "ready_backfill"/);
    assert.match(worker, /remainedReady/);
    assert.match(worker, /preservationViolations/);
    assert.match(worker, /boundedDesignIds/);
    assert.match(worker, /nextBoundedDesignId/);
  });

  it("onWrite worker allows ready_catalog execution", () => {
    const source = readFileSync(join(here, "onCatalogReprocessJobWritten.ts"), "utf8");
    assert.match(source, /ready_catalog/);
    assert.doesNotMatch(source, /targetType !== "ai_review_queue"\)[\s\S]*slice_execution_not_enabled/);
  });

  it("pipeline defines ready_backfill mode", () => {
    const pipeline = readFileSync(join(here, "../ai/aiEnrichmentPipeline.ts"), "utf8");
    assert.match(pipeline, /ready_backfill/);
    assert.match(pipeline, /mode === "ready_backfill"/);
    assert.match(pipeline, /smartProfileAiSnapshot/);
  });

  it("worker uses semantic approval audit comparison", () => {
    const worker = readFileSync(join(here, "catalogReprocessWorker.ts"), "utf8");
    assert.match(worker, /readyApprovalAuditUnchanged/);
  });

  it("Start validates canaryDesignIds and stores boundedDesignIds", () => {
    const callables = readFileSync(join(here, "catalogReprocessCallables.ts"), "utf8");
    assert.match(callables, /resolveBoundedCanaryDesignIds/);
    assert.match(callables, /boundedDesignIds/);
    assert.match(callables, /canaryDesignIds/);
    assert.match(callables, /buildReadyCatalogInventory/);
  });

  it("Start Shadow preflight applies to ready_catalog", () => {
    const callables = readFileSync(join(here, "catalogReprocessCallables.ts"), "utf8");
    assert.match(callables, /rawTarget === "ready_catalog"/);
    assert.match(callables, /assertShadowCalibrationStartAllowed/);
  });

  it("Ready gate enabled after owner unlock", () => {
    const constants = readFileSync(
      join(here, "../../../packages/shared/src/constants/catalogReprocess.constants.ts"),
      "utf8",
    );
    assert.match(constants, /CATALOG_REPROCESS_READY_CATALOG_ENABLED = true/);
  });

  it("Algolia delete-on-non-ready regression remains", () => {
    const sync = readFileSync(join(here, "../algolia/syncPortalCatalogDesignToAlgolia.ts"), "utf8");
    assert.match(sync, /afterReady = after\?\.status === ['"]ready['"]/);
    assert.match(sync, /deleteObject/);
  });

  it("Studio enables Ready Start only when target gate enabled", () => {
    const section = readFileSync(
      join(
        here,
        "../../../apps/studio/src/renderer/src/features/settings/components/CatalogReprocessingSettingsSection.tsx",
      ),
      "utf8",
    );
    assert.match(section, /ready_catalog/);
    assert.match(section, /canaryDesignIds|Canary design IDs/);
    assert.match(section, /Start \(unavailable\)/);
    assert.doesNotMatch(section, /targetType === "ai_review_queue" &&[\s\S]*startAllowed/);
  });
});
