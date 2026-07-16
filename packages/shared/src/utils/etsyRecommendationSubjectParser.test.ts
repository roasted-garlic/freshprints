import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { matchSuggestDictionary } from "../constants/etsyRecommendation/etsyRecommendationSuggestDictionary";
import { parseEtsyRecommendationSubjectText } from "./etsyRecommendationSubjectParser";

describe("parseEtsyRecommendationSubjectText", () => {
  it("parses highland cow via dictionary", () => {
    const parsed = parseEtsyRecommendationSubjectText("highland cow");
    assert.ok(parsed.subjectTokens.some((token) => /highland/i.test(token)));
  });

  it("parses Wednesday Addams as a phrase", () => {
    const parsed = parseEtsyRecommendationSubjectText("Wednesday Addams");
    assert.equal(parsed.previewLabel.toLowerCase().includes("wednesday"), true);
    assert.equal(parsed.previewLabel.toLowerCase().includes("addams"), true);
  });

  it("parses doctor goose", () => {
    const parsed = parseEtsyRecommendationSubjectText("doctor goose");
    assert.ok(parsed.subjectTokens.some((t) => /doctor/i.test(t)));
    assert.ok(parsed.subjectTokens.some((t) => /goose/i.test(t)));
  });

  it("strips stop-word fluff", () => {
    const parsed = parseEtsyRecommendationSubjectText("a funny design of the grinch");
    assert.ok(parsed.subjectTokens.some((t) => /grinch/i.test(t)));
    assert.equal(parsed.subjectTokens.includes("a"), false);
    assert.equal(parsed.subjectTokens.includes("the"), false);
  });

  it("rejects empty subject text", () => {
    assert.throws(() => parseEtsyRecommendationSubjectText("   "), /Describe what/);
  });

  it("drops leftover typed prefixes after a dictionary match", () => {
    const parsed = parseEtsyRecommendationSubjectText("high highland cow");
    assert.match(parsed.previewLabel, /highland cow/i);
    assert.equal(/\bhigh\b/i.test(parsed.previewLabel.replace(/highland/i, "")), false);
  });
});

describe("matchSuggestDictionary", () => {
  it("finds wednesday by partial query", () => {
    const matches = matchSuggestDictionary("wednes");
    assert.ok(matches.some((entry) => entry.id === "wednesday_addams"));
  });
});
