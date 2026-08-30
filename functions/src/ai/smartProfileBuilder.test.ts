import assert from "node:assert/strict";

import { describe, it } from "node:test";



import { SMART_PROFILE_VERSION } from "../../../packages/shared/src/types/catalog/smartProfile.types";

import type { DesignSmartProfile } from "../../../packages/shared/src/types/catalog/smartProfile.types";

import { CATALOG_TITLE_MAX_CHARACTERS } from "../../../packages/shared/src/constants/smartProfile.constants";



import {

  buildDesignSmartProfile,

  parseHalftoneShadowAssessment,

  stripEmptySmartProfileDimensions,

} from "./smartProfileBuilder";



function assertNoUndefinedDeep(value: unknown, path = "$"): void {

  if (value === undefined) {

    assert.fail(`undefined at ${path}`);

  }



  if (Array.isArray(value)) {

    value.forEach((item, index) => assertNoUndefinedDeep(item, `${path}[${index}]`));

    return;

  }



  if (value && typeof value === "object") {

    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {

      assertNoUndefinedDeep(entry, `${path}.${key}`);

    }

  }

}



const baseSuggestions = {

  title: "Highland Cow With Plaid Bow",

  description: "A cartoon highland cow with a red plaid bow.",

  promptVersion: "catalog-enrich-v27",

  provider: "google",

  model: "gemini-2.5-flash-lite",

  generatedAt: "2026-08-24T00:00:00.000Z",

};



describe("buildDesignSmartProfile", () => {

  it("normalizes dimensions and records shadow provenance", () => {

    const profile = buildDesignSmartProfile({

      parsed: {

        category: "Animals",

        description: "A raccoon with coffee.",

        suggestedNewTags: [],

        title: "Trash Panda Coffee Addict",

        tags: ["raccoon"],

        rawTags: ["raccoon"],

        subjects: ["Raccoon", "raccoon"],

        searchConcepts: ["trash panda", "caffeine humor"],

        readableTextLines: ["Coffee Addict"],

      },

      suggestions: {

        title: "Trash Panda Coffee Addict",

        description: "A raccoon with coffee.",

        promptVersion: "catalog-enrich-v27",

        provider: "google",

        model: "gemini-2.5-flash-lite",

        generatedAt: "2026-08-24T00:00:00.000Z",

      },

      categoryId: "animals",

      categoryName: "Animals",

      categoryIdsByName: { animals: "animals-id" },

    });



    assert.equal(profile.provenance.version, SMART_PROFILE_VERSION);

    assert.deepEqual(profile.subjects, ["Raccoon"]);

    assert.ok(profile.searchConcepts?.includes("trash panda"));

    assert.equal(profile.provenance.automationDecision, "shadow");

    assert.equal(profile.provenance.titleOutcome, "first_pass");

  });



  it("omits validationWarnings when none exist (no undefined key)", () => {

    const profile = buildDesignSmartProfile({

      parsed: {

        category: "Animals",

        description: "A highland cow.",

        suggestedNewTags: [],

        title: baseSuggestions.title,

        tags: ["cow"],

        rawTags: ["cow"],

        subjects: ["Highland Cow"],

      },

      suggestions: baseSuggestions,

      categoryId: "animals",

      categoryName: "Animals",

      categoryIdsByName: { animals: "animals-id" },

    });



    assert.equal(

      Object.prototype.hasOwnProperty.call(profile.provenance, "validationWarnings"),

      false,

    );

  });



  it("persists validationWarnings when title exceeds max characters", () => {

    const longTitle = "A".repeat(CATALOG_TITLE_MAX_CHARACTERS + 1);

    const profile = buildDesignSmartProfile({

      parsed: {

        category: "Animals",

        description: "A highland cow.",

        suggestedNewTags: [],

        title: longTitle,

        tags: ["cow"],

        rawTags: ["cow"],

        subjects: ["Highland Cow"],

      },

      suggestions: {

        ...baseSuggestions,

        title: longTitle,

      },

      categoryId: "animals",

      categoryName: "Animals",

      categoryIdsByName: { animals: "animals-id" },

    });



    assert.ok(Array.isArray(profile.provenance.validationWarnings));

    assert.ok(

      profile.provenance.validationWarnings?.includes("title_exceeds_max_characters"),

    );

  });

});



describe("stripEmptySmartProfileDimensions", () => {

  it("produces Firestore-safe payload when validationWarnings are absent", () => {

    const profile = buildDesignSmartProfile({

      parsed: {

        category: "Animals",

        description: "A highland cow.",

        suggestedNewTags: [],

        title: baseSuggestions.title,

        tags: ["cow"],

        rawTags: ["cow"],

        subjects: ["Highland Cow"],

        categoryAlternatives: [{ name: "Pets", reason: "cute animal" }],

      },

      suggestions: {

        ...baseSuggestions,

        provider: undefined,

        model: undefined,

      },

      categoryId: "animals",

      categoryName: "Animals",

      categoryIdsByName: { pets: "pets-id" },

    });



    // Simulate optional provenance fields that may be undefined in memory.

    const withOptionalGaps: DesignSmartProfile = {

      ...profile,

      provenance: {

        ...profile.provenance,

        provider: undefined,

        model: undefined,

        verifierInvoked: undefined,

        automationReasonCodes: undefined,

        validationWarnings: undefined,

      },

      categoryAlternatives: [

        {

          categoryName: "Pets",

          categoryId: undefined,

          reason: undefined,

        },

      ],

    };



    const persisted = stripEmptySmartProfileDimensions(withOptionalGaps);

    assertNoUndefinedDeep(persisted);



    const provenance = persisted.provenance as Record<string, unknown>;

    assert.equal(Object.prototype.hasOwnProperty.call(provenance, "validationWarnings"), false);

    assert.equal(Object.prototype.hasOwnProperty.call(provenance, "provider"), false);

    assert.equal(Object.prototype.hasOwnProperty.call(provenance, "model"), false);

    assert.equal(Object.prototype.hasOwnProperty.call(provenance, "verifierInvoked"), false);

    assert.equal(Object.prototype.hasOwnProperty.call(provenance, "automationReasonCodes"), false);



    const alternatives = persisted.categoryAlternatives as Array<Record<string, unknown>>;

    assert.equal(alternatives.length, 1);

    assert.equal(Object.prototype.hasOwnProperty.call(alternatives[0], "categoryId"), false);

    assert.equal(Object.prototype.hasOwnProperty.call(alternatives[0], "reason"), false);

    assert.equal(alternatives[0].categoryName, "Pets");

  });



  it("persists validationWarnings when present without introducing undefined siblings", () => {

    const longTitle = "B".repeat(CATALOG_TITLE_MAX_CHARACTERS + 5);

    const profile = buildDesignSmartProfile({

      parsed: {

        category: "Animals",

        description: "A highland cow.",

        suggestedNewTags: [],

        title: longTitle,

        tags: ["cow"],

        rawTags: ["cow"],

        subjects: ["Highland Cow"],

        objects: [],

        styles: undefined,

      },

      suggestions: {

        ...baseSuggestions,

        title: longTitle,

      },

      categoryId: "animals",

      categoryName: "Animals",

      categoryIdsByName: { animals: "animals-id" },

    });



    profile.provenance.automationReasonCodes = ["title:title_exceeds_max_characters"];



    const persisted = stripEmptySmartProfileDimensions(profile);

    assertNoUndefinedDeep(persisted);



    const provenance = persisted.provenance as Record<string, unknown>;

    assert.deepEqual(provenance.validationWarnings, ["title_exceeds_max_characters"]);

    assert.deepEqual(provenance.automationReasonCodes, ["title:title_exceeds_max_characters"]);

    assert.equal(Object.prototype.hasOwnProperty.call(persisted, "objects"), false);

    assert.equal(Object.prototype.hasOwnProperty.call(persisted, "styles"), false);

  });

});



describe("parseHalftoneShadowAssessment", () => {

  it("omits evidence when absent (no undefined)", () => {

    const assessment = parseHalftoneShadowAssessment({

      category: "Animals",

      description: "x",

      suggestedNewTags: [],

      title: "x",

      tags: [],

      rawTags: [],

      halftoneShadowLikelihood: "possible",

    });



    assert.ok(assessment);

    assert.equal(assessment?.likelihood, "possible");

    assert.equal(Object.prototype.hasOwnProperty.call(assessment, "evidence"), false);

    assertNoUndefinedDeep(assessment);

  });

});


