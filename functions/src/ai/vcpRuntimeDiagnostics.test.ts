import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPromptVcpDiagnostic,
  classifyVcpParse,
  isVcpRuntimeDiagnosticsEnabled,
  sha256Prompt,
} from "./vcpRuntimeDiagnostics";

describe("VCP runtime diagnostics", () => {
  it("hashes identical prompts deterministically without exposing prompt text", () => {
    const prompt = "Owner text with {{approved_categories}} visual-context-v1";
    assert.equal(sha256Prompt(prompt), sha256Prompt(prompt));
    const diagnostic = buildPromptVcpDiagnostic(prompt);
    assert.equal(typeof diagnostic.effectivePromptSha256, "string");
    assert.equal("prompt" in diagnostic, false);
    assert.equal(JSON.stringify(diagnostic).includes(prompt), false);
  });

  it("reports VCP markers without logging the effective prompt", () => {
    const current = '"visualContextProfile":{"version":"visual-context-v1"}';
    assert.deepEqual(buildPromptVcpDiagnostic(current), {
      effectivePromptSha256: sha256Prompt(current),
      promptContainsVisualContextProfile: true,
      promptContainsVisualContextV1: true,
    });
    assert.equal(buildPromptVcpDiagnostic("legacy prompt").promptContainsVisualContextProfile, false);
    assert.equal(buildPromptVcpDiagnostic("legacy prompt").promptContainsVisualContextV1, false);
  });

  it("classifies missing, invalid, and valid parser outcomes", () => {
    assert.equal(classifyVcpParse(false, false), "missing");
    assert.equal(classifyVcpParse(true, false), "invalid");
    assert.equal(classifyVcpParse(true, true), "valid");
  });

  it("is enabled only for the DEV project", () => {
    const original = process.env.GCLOUD_PROJECT;
    process.env.GCLOUD_PROJECT = "fresh-prints-dev";
    assert.equal(isVcpRuntimeDiagnosticsEnabled(), true);
    process.env.GCLOUD_PROJECT = "fresh-prints-prod";
    assert.equal(isVcpRuntimeDiagnosticsEnabled(), false);
    if (original === undefined) delete process.env.GCLOUD_PROJECT;
    else process.env.GCLOUD_PROJECT = original;
  });
});
