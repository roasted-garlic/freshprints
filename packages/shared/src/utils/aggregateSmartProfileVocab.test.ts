/**
 * Aggregate Smart Profile vocab from existing designs — unit tests.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  accumulateSmartProfileVocabCounts,
  aggregateSmartProfileVocabFromProfiles,
  createEmptySmartProfileVocabCountMaps,
  listsFromSmartProfileVocabCounts,
  smartProfileVocabListsHaveValues,
} from "./aggregateSmartProfileVocab";

describe("aggregateSmartProfileVocabFromProfiles", () => {
  it("takes top-N by frequency from sampled profiles", () => {
    const result = aggregateSmartProfileVocabFromProfiles(
      [
        { subjects: ["Highland Cow", "cow"], styles: ["cute"] },
        { subjects: ["Highland Cow"], styles: ["cute"] },
        { subjects: ["raccoon"], styles: ["sarcastic"] },
        { subjects: ["Highland Cow", "farm animal"], objects: ["hat"] },
      ],
      { topN: 2 },
    );

    assert.equal(result.sampleSize, 4);
    assert.deepEqual(result.lists.subjects, ["Highland Cow", "cow"]);
    assert.deepEqual(result.lists.styles, ["cute", "sarcastic"]);
    assert.deepEqual(result.lists.objects, ["hat"]);
  });

  it("honors sampleLimit and does not invent curated seeds", () => {
    const result = aggregateSmartProfileVocabFromProfiles(
      [
        { subjects: ["a"] },
        { subjects: ["b"] },
        { subjects: ["c"] },
      ],
      { sampleLimit: 2, topN: 10 },
    );
    assert.equal(result.sampleSize, 2);
    assert.deepEqual(result.lists.subjects, ["a", "b"]);
    assert.equal(result.lists.subjects?.includes("santa"), false);
    assert.equal(result.lists.subjects?.includes("nurse"), false);
  });

  it("accumulate + lists helpers stay empty without curated defaults", () => {
    const maps = createEmptySmartProfileVocabCountMaps();
    accumulateSmartProfileVocabCounts(maps, { subjects: ["  raccoon  ", ""] });
    const lists = listsFromSmartProfileVocabCounts(maps, 40);
    assert.deepEqual(lists.subjects, ["raccoon"]);
    assert.equal(smartProfileVocabListsHaveValues(lists), true);
    assert.equal(smartProfileVocabListsHaveValues({}), false);
  });
});