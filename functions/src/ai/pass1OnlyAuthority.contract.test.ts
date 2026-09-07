import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("Pass 1-only active authority contract", () => {
  it("removes automatic Pass 2 provider execution from candidate generation", () => {
    const candidateCore = read("./aiEnrichmentCandidateCore.ts");
    assert.doesNotMatch(candidateCore, /callSemanticReviewer/);
    assert.doesNotMatch(candidateCore, /canRunSemanticReview/);
    assert.match(candidateCore, /Pass 1 is the sole active Processing authority/);
  });

  it("strips retired AI tag fields before design persistence", () => {
    const pipeline = read("./aiEnrichmentPipeline.ts");
    assert.match(pipeline, /stripRetiredAiSuggestionFields/);
    assert.match(pipeline, /delete activeSuggestions\.tags/);
    assert.match(pipeline, /delete activeSuggestions\.suggestedNewTags/);
    assert.match(pipeline, /stripTransientAiAnalysisFields/);
    assert.match(pipeline, /delete persistedAnalysis\.rawTags/);
  });

  it("gates manual Pass 2 before provider construction and dispatch", () => {
    const playground = read("./semanticReviewPlayground.ts");
    const gate = playground.indexOf("if (!settings.semanticReviewPlaygroundEnabled)");
    const providerTarget = playground.indexOf(
      "const target = resolveProviderTarget",
    );
    const providerCall = playground.indexOf(
      "result = await callSemanticReviewer",
    );
    assert.ok(gate >= 0);
    assert.ok(providerTarget > gate);
    assert.ok(providerCall > gate);
    assert.match(playground, /rejectionReason: "experimental_disabled"/);
  });

  it("keeps every automatic Processing entrypoint independent of both Pass 2 settings", () => {
    const pipeline = read("aiEnrichmentPipeline.ts");
    const candidateCore = read("aiEnrichmentCandidateCore.ts");
    const reprocessWorker = read("../catalogReprocess/catalogReprocessWorker.ts");
    const readyReprocess = read("../reprocessReadyDesignWithAi.ts");

    for (const source of [pipeline, candidateCore, reprocessWorker, readyReprocess]) {
      assert.doesNotMatch(source, /callSemanticReviewer/);
      assert.doesNotMatch(source, /semanticReviewerEnabled/);
      assert.doesNotMatch(source, /semanticReviewPlaygroundEnabled/);
    }
    assert.match(pipeline, /await markAiSuccess/);
    assert.match(reprocessWorker, /deriveOutcomeFlags/);
    assert.match(readyReprocess, /runAiEnrichmentPipeline/);
  });

  it("recomputes WAA only after staff/import profile merge", () => {
    const pipeline = read("aiEnrichmentPipeline.ts");
    const merge = pipeline.indexOf("mergeReadyBackfillSmartProfile");
    const decision = pipeline.indexOf(
      "const effectiveDecision = computeCatalogAutomationDecision",
    );
    assert.ok(merge >= 0);
    assert.ok(decision > merge);
    assert.match(
      pipeline,
      /Re-evaluate WAA only after staff\/import authority has been merged/,
    );
  });

  it("keeps manual Pass 2 non-persisting and visibly experimental", () => {
    const playground = read("semanticReviewPlayground.ts");
    assert.doesNotMatch(playground, /adminDb|markAiSuccess|updateDesign/);
    assert.match(playground, /source: "PLAYGROUND"/);
    assert.match(playground, /pass: "PASS 2"/);
    assert.match(playground, /semanticReviewPlaygroundEnabled/);
  });

  it("keeps the experimental setting owner-only and separate from the legacy field", () => {
    const settingCallable = read("../updateSemanticReviewPlaygroundSetting.ts");
    const legacySettingsCallable = read("../updateAiEnrichmentSettings.ts");
    assert.match(settingCallable, /caller\.role !== "owner"/);
    assert.match(settingCallable, /semanticReviewPlaygroundEnabled/);
    assert.doesNotMatch(legacySettingsCallable, /semanticReviewerEnabled/);
    assert.doesNotMatch(legacySettingsCallable, /semanticReviewPlaygroundEnabled/);
  });
});
