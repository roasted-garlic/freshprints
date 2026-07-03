import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveSuggestionAuthorMode, resolveTagRerankMode } from "./loadAiEnrichmentSettings";

describe("resolveTagRerankMode", () => {
  it("defaults to off for undefined/missing values", () => {
    assert.equal(resolveTagRerankMode(undefined), "off");
  });

  it("defaults to off for an invalid string", () => {
    assert.equal(resolveTagRerankMode("not-a-real-mode"), "off");
  });

  it("defaults to off for a non-string value", () => {
    assert.equal(resolveTagRerankMode(42), "off");
  });

  it("accepts off, auto, and always", () => {
    assert.equal(resolveTagRerankMode("off"), "off");
    assert.equal(resolveTagRerankMode("auto"), "auto");
    assert.equal(resolveTagRerankMode("always"), "always");
  });
});

describe("resolveSuggestionAuthorMode", () => {
  it("defaults to off for undefined/missing values", () => {
    assert.equal(resolveSuggestionAuthorMode(undefined), "off");
  });

  it("defaults to off for an invalid string", () => {
    assert.equal(resolveSuggestionAuthorMode("not-a-real-mode"), "off");
  });

  it("defaults to off for a non-string value", () => {
    assert.equal(resolveSuggestionAuthorMode(42), "off");
  });

  it("accepts off, auto, and always", () => {
    assert.equal(resolveSuggestionAuthorMode("off"), "off");
    assert.equal(resolveSuggestionAuthorMode("auto"), "auto");
    assert.equal(resolveSuggestionAuthorMode("always"), "always");
  });

  it("is independent from resolveTagRerankMode — an invalid tagRerankMode does not affect this", () => {
    assert.equal(resolveSuggestionAuthorMode("auto"), "auto");
    assert.equal(resolveTagRerankMode("not-a-real-mode"), "off");
  });
});
