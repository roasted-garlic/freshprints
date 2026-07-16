import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ETSY_RECOMMENDATION_DIGITAL_PNG_TERMS } from "../constants/etsyRecommendation/etsyRecommendation.constants";
import {
  buildEtsyRecommendationApiKeywords,
  buildEtsyRecommendationApiKeywordsFallback,
  buildEtsyRecommendationBroaderQuery,
  buildEtsyRecommendationCanonicalQuery,
  buildEtsyRecommendationSearchUrl,
  decodeEtsySearchUrlQuery,
} from "./etsyRecommendationQueryBuilder";

describe("website-first Etsy query builders", () => {
  it("builds highland-cow free-text canonical query", () => {
    const answers = {
      subjectText: "highland cow",
      styles: ["Funny" as const],
      wording: "Apparently I have an attitude",
    };

    const canonical = buildEtsyRecommendationCanonicalQuery(answers);
    const broader = buildEtsyRecommendationBroaderQuery(answers);

    assert.match(canonical, /highland cow/i);
    assert.match(canonical, /Funny/);
    assert.match(canonical, /Apparently/);
    assert.match(canonical, /\bpng\b/);
    assert.equal(/digital download/i.test(canonical), false);
    assert.match(broader, /Apparently/i);
    assert.equal(/\bhighland\b/i.test(broader), false);
    assert.equal(/\bFunny\b/.test(broader), false);
    assert.match(broader, /\bpng\b/);
  });

  it("broader query falls back to subject when exact saying is empty", () => {
    const broader = buildEtsyRecommendationBroaderQuery({
      subjectText: "highland cow",
      styles: ["Funny"],
    });
    assert.match(broader, /highland cow/i);
    assert.equal(/\bFunny\b/.test(broader), false);
    assert.match(broader, /\bpng\b/);
  });

  it("parses Wednesday Addams into canonical query", () => {
    const canonical = buildEtsyRecommendationCanonicalQuery({
      subjectText: "Wednesday Addams",
      styles: ["Sarcastic"],
    });
    assert.match(canonical, /wednesday/i);
    assert.match(canonical, /addams/i);
    assert.match(canonical, /Sarcastic/);
  });

  it("legacy subjects path still works", () => {
    assert.equal(
      buildEtsyRecommendationBroaderQuery({
        subjects: ["mama_bear"],
        styles: ["Funny"],
        wording: "Best Mama Ever",
      }),
      `Best Mama Ever ${ETSY_RECOMMENDATION_DIGITAL_PNG_TERMS}`,
    );
    assert.equal(
      buildEtsyRecommendationBroaderQuery({
        subjects: ["mama_bear"],
        styles: ["Funny"],
      }),
      `mama bear ${ETSY_RECOMMENDATION_DIGITAL_PNG_TERMS}`,
    );
  });

  it("appends free-text tone to canonical query", () => {
    const canonical = buildEtsyRecommendationCanonicalQuery({
      subjectText: "highland cow",
      styles: ["whimsical gothic"],
    });
    assert.match(canonical, /highland cow/i);
    assert.match(canonical, /whimsical gothic/i);
    assert.match(canonical, /\bpng\b/);
  });

  it("website URL keeps png in q and applies default browse filters", () => {
    const canonical = buildEtsyRecommendationCanonicalQuery({
      subjectText: "highland cow",
      styles: ["Funny"],
    });
    const url = buildEtsyRecommendationSearchUrl(canonical);
    const parsed = new URL(url);
    assert.equal(decodeEtsySearchUrlQuery(url), canonical);
    assert.equal(parsed.searchParams.get("instant_download"), "true");
    assert.equal(parsed.searchParams.get("explicit"), "1");
    assert.equal(parsed.searchParams.get("custom_price"), "1");
    assert.equal(parsed.searchParams.get("max"), "3");
    assert.equal(parsed.searchParams.has("locationQuery"), false);
    assert.match(canonical, /\bpng\b/);
    assert.equal(/digital download/i.test(canonical), false);
  });
});

describe("Open API keyword builders", () => {
  it("builds focused keywords from free-text subject + style + capped saying + png", () => {
    const keywords = buildEtsyRecommendationApiKeywords({
      subjectText: "highland cow",
      styles: ["Funny"],
      wording: "Apparently I have an attitude problem today forever always",
    });
    assert.match(keywords, /highland/i);
    assert.match(keywords, /Funny/);
    assert.match(keywords, /Apparently/i);
    assert.match(keywords, /\bpng\b/);
    assert.equal(/digital download/i.test(keywords), false);
    assert.equal(/\bforever\b/i.test(keywords), false);
    assert.equal(/\balways\b/i.test(keywords), false);
  });

  it("fallback matches broader saying or subject + png", () => {
    const withSaying = buildEtsyRecommendationApiKeywordsFallback({
      subjectText: "highland cow",
      styles: ["Funny"],
      wording: "Best Cow Ever",
    });
    assert.match(withSaying, /Best/i);
    assert.match(withSaying, /Cow/i);
    assert.equal(/\bhighland\b/i.test(withSaying), false);
    assert.match(withSaying, /\bpng\b/);

    const subjectOnly = buildEtsyRecommendationApiKeywordsFallback({
      subjectText: "highland cow",
      styles: ["Funny"],
    });
    assert.match(subjectOnly, /highland/i);
    assert.equal(/\bFunny\b/.test(subjectOnly), false);
    assert.match(subjectOnly, /\bpng\b/);
  });
});
