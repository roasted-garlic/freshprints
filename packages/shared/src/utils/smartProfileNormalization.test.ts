import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSmartCanonicalVocabMap,
  matchExactCanonicalDisplay,
  smartCanonicalKey,
} from "./smartCanonicalKey";
import { normalizeSmartProfileStringList } from "./smartProfileNormalization";
import {
  evaluateSemanticConsistency,
  textDominantSoftCheck,
} from "./smartProfileConsistency";
import {
  formatSmartProfileVocabPromptSection,
  takeTopNFromCounts,
} from "./smartProfileVocab";

describe("smartCanonicalKey / safe normalize", () => {
  it("folds case, whitespace, punctuation, and separators", () => {
    assert.equal(smartCanonicalKey("  Highland-Cow  "), "highland cow");
    assert.equal(smartCanonicalKey("highland_cow"), "highland cow");
    assert.equal(smartCanonicalKey("Highland, Cow!"), "highland cow");
  });

  it("folds obvious plural without semantic rewrite", () => {
    assert.equal(smartCanonicalKey("raccoons"), "raccoon");
    assert.equal(smartCanonicalKey("nurses"), "nurse");
  });

  it("does not collapse distinct multi-word identities", () => {
    assert.notEqual(smartCanonicalKey("highland cow"), smartCanonicalKey("cow"));
    assert.notEqual(smartCanonicalKey("teacher"), smartCanonicalKey("educator"));
    assert.notEqual(smartCanonicalKey("funny"), smartCanonicalKey("sarcastic"));
    assert.notEqual(smartCanonicalKey("retro"), smartCanonicalKey("vintage"));
    assert.notEqual(smartCanonicalKey("nurse"), smartCanonicalKey("healthcare worker"));
  });
});

describe("exact canonical vocab match", () => {
  it("rewrites only on exact canonical key match; preserves novel terms", () => {
    const vocab = buildSmartCanonicalVocabMap(["Highland Cow", "raccoon", "Christmas"]);
    assert.equal(matchExactCanonicalDisplay("highland-cow", vocab), "Highland Cow");
    assert.equal(matchExactCanonicalDisplay("Raccoons", vocab), "raccoon");
    assert.equal(matchExactCanonicalDisplay("santa", vocab), "santa");
  });

  it("normalizeSmartProfileStringList uses vocab and preserves unmatched", () => {
    const vocab = buildSmartCanonicalVocabMap(["Highland Cow"]);
    const result = normalizeSmartProfileStringList(["highland cow", "cow", "Highland-Cow"], {
      canonicalVocab: vocab,
    });
    assert.deepEqual(result, ["Highland Cow", "cow"]);
  });

  it("does not depend on a curated seed list when vocab is empty", () => {
    const result = normalizeSmartProfileStringList(["highland cow", "santa", "nurse"]);
    assert.deepEqual(result, ["highland cow", "santa", "nurse"]);
  });
});

describe("smartProfileVocab formatting", () => {
  it("formats bounded top-N without inventing curated seeds", () => {
    const top = takeTopNFromCounts({ cow: 10, raccoon: 5, zebra: 1 }, 2);
    assert.deepEqual(top, ["cow", "raccoon"]);
    const section = formatSmartProfileVocabPromptSection({ subjects: top });
    assert.match(section, /subjects: cow, raccoon/);
    assert.match(section, /Prefer reusing/);
    assert.doesNotMatch(section, /subjects:.*highland cow/);
  });
});

describe("consistency + text-dominant soft checks", () => {
  it("fails when primary highland cow identity disappears despite high aggregate", () => {
    const left = {
      subjects: ["highland cow", "cow"],
      themes: ["farm humor"],
      searchConcepts: ["funny highland cow"],
    };
    const right = {
      subjects: ["cow"],
      themes: ["farm humor"],
      searchConcepts: ["funny cow"],
    };
    const result = evaluateSemanticConsistency({
      left,
      right,
      requiredCoreConcepts: [{ dimension: "subjects", concept: "highland cow" }],
      minAggregateOverlap: 0.5,
    });
    assert.equal(result.aggregatePass, true);
    assert.equal(result.coreIdentity.pass, false);
    assert.equal(result.pass, false);
  });

  it("passes when core identity held across color-variant-like profiles", () => {
    const left = {
      subjects: ["highland cow"],
      themes: ["farm"],
      colors: ["white"],
      visibleText: ["Moo"],
    };
    const right = {
      subjects: ["highland cow"],
      themes: ["farm"],
      colors: ["black"],
      visibleText: ["Moo"],
    };
    const result = evaluateSemanticConsistency({
      left,
      right,
      requiredCoreConcepts: [
        { dimension: "subjects", concept: "highland cow" },
        { dimension: "visibleText", concept: "Moo" },
      ],
    });
    assert.equal(result.pass, true);
  });

  it("text-dominant soft check fires without subjects and without meta", () => {
    const soft = textDominantSoftCheck({
      readableTextLines: ["I love coffee"],
      subjects: [],
      objects: [],
      profile: { themes: ["coffee"], searchConcepts: ["coffee humor"] },
    });
    assert.equal(soft.fires, true);
    assert.equal(soft.hasMeta, false);
    assert.equal(soft.softFail, true);
  });

  it("text-dominant soft check passes when typography meta present", () => {
    const soft = textDominantSoftCheck({
      readableTextLines: ["Be kind"],
      subjects: [],
      objects: [],
      profile: { themes: ["typography"], searchConcepts: ["kindness saying"] },
    });
    assert.equal(soft.softFail, false);
  });
});
