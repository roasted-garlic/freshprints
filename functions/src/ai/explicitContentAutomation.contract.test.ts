import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(join(here, rel), "utf8");
}

describe("explicit content automation wiring (contract) — ADR-FP-172", () => {
  it("does not introduce profanity hard-blocker validation codes", () => {
    const decision = read("../../../packages/shared/src/utils/catalogAutomationDecision.ts");
    const candidate = read("aiEnrichmentCandidateCore.ts");
    assert.doesNotMatch(decision, /validation:profanity_artwork/);
    assert.doesNotMatch(decision, /validation:profanity_catalog_copy/);
    assert.doesNotMatch(candidate, /validation:profanity_/);
  });

  it("wires classification into markAiSuccess independently of Ready", () => {
    const candidate = read("aiEnrichmentCandidateCore.ts");
    const pipeline = read("aiEnrichmentPipeline.ts");
    assert.match(candidate, /classifyExplicitContentAutomation/);
    assert.match(candidate, /explicitContentArtworkEvidence/);
    assert.match(candidate, /explicit_automation_settings_unavailable/);
    assert.match(pipeline, /explicitContentAutomation/);
    assert.match(pipeline, /hasProtectedStaffExplicitAuthority/);
    assert.match(pipeline, /explicitContentAutomationLocked/);
    assert.match(pipeline, /isExplicitContent: true/);
    assert.match(pipeline, /explicitContentSource: "automation"/);
  });

  it("computes Explicit preview outside publishReady gate and fail-closes Autonomous on settings failure", () => {
    const candidate = read("aiEnrichmentCandidateCore.ts");
    assert.match(candidate, /explicitAutomationPreview/);
    assert.match(candidate, /buildExplicitContentAutomationPreview/);
    assert.match(candidate, /settingsReadFailed && automationDecision\.wouldAutoApprove/);
    assert.doesNotMatch(candidate, /settingsReadFailed && publishReady/);
    assert.doesNotMatch(
      candidate,
      /if \(publishReady\) \{\s*const classification = classifyExplicitContentAutomation/,
    );
  });

  it("pipeline Explicit write is not publishReady-gated and lock-gated only", () => {
    const pipeline = read("aiEnrichmentPipeline.ts");
    assert.match(pipeline, /applyHumanAuthorityToExplicitContentAutomationPreview/);
    assert.match(pipeline, /mayWriteExplicit/);
    assert.match(pipeline, /ADR-FP-173/);
    assert.match(pipeline, /explicitContentAutomationLocked/);
    // Ready-only coupling must be gone.
    assert.doesNotMatch(pipeline, /mayWriteExplicit\s*=\s*[\s\S]*?publishReady\s*&&/);
    assert.doesNotMatch(pipeline, /publishReady &&[\s\S]{0,80}explicitContentAutomation/);
  });

  it("keeps settings field and cache clear on update", () => {
    const load = read("loadAiEnrichmentSettings.ts");
    const update = read("../updateAiEnrichmentSettings.ts");
    assert.match(load, /explicitContentAutomationTerms/);
    assert.match(load, /settingsReadFailed/);
    assert.match(update, /explicitContentAutomationTerms/);
    assert.match(update, /clearAiEnrichmentRuntimeCache/);
  });

  it("retains v34 / v6 / v1 version pins", () => {
    const titleRules = read("catalogTitleRules.ts");
    assert.match(titleRules, /catalog-enrich-v34/);
  });

  it("does not wire Explicit classifier into Print Request finalize paths", () => {
    const candidate = read("aiEnrichmentCandidateCore.ts");
    assert.doesNotMatch(candidate, /printRequest.*classifyExplicitContentAutomation/);
    assert.doesNotMatch(candidate, /finalizePrintRequest.*explicitContent/);
  });
});
