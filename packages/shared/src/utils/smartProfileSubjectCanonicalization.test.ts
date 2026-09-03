import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SMART_PROFILE_VERSION } from "../types/catalog/smartProfile.types";
import { mergeSmartProfileImportPresets } from "./smartProfileImportPresets";
import {
  collapseRedundantSubjectDerivatives,
  classifySubjectModifier,
} from "./smartProfileSubjectCanonicalization";
import {
  normalizeDesignSmartProfile,
  normalizeSmartProfileDimensions,
} from "./smartProfileNormalization";

function normalizeAi(input: {
  subjects?: string[];
  objects?: string[];
  styles?: string[];
  themes?: string[];
  interests?: string[];
  places?: string[];
  colors?: string[];
  searchConcepts?: string[];
  visibleText?: string[];
  title?: string;
  description?: string;
  centralSubject?: string;
}) {
  return normalizeDesignSmartProfile(
    {
      subjects: input.subjects,
      objects: input.objects,
      styles: input.styles,
      themes: input.themes,
      interests: input.interests,
      places: input.places,
      colors: input.colors,
      searchConcepts: input.searchConcepts,
      visibleText: input.visibleText,
      provenance: {
        version: SMART_PROFILE_VERSION,
        generatedAt: "2026-09-03T00:00:00.000Z",
      },
    },
    undefined,
    {
      title: input.title,
      description: input.description,
      centralSubject: input.centralSubject,
      visibleText: input.visibleText,
    },
  );
}

describe("subject modifier classes", () => {
  it("classifies action, style, verb, bound, and type without a phrase map", () => {
    assert.equal(classifySubjectModifier("leaping"), "derivative");
    assert.equal(classifySubjectModifier("vintage"), "derivative");
    assert.equal(classifySubjectModifier("make"), "derivative");
    assert.equal(classifySubjectModifier("highland"), "bound");
    assert.equal(classifySubjectModifier("bass"), "type");
    assert.equal(classifySubjectModifier("f-caw-f"), "other");
  });
});

describe("collapseRedundantSubjectDerivatives fish fixtures", () => {
  it("F1 generic fish keeps fish", () => {
    const profile = normalizeAi({ subjects: ["fish"] });
    assert.ok(profile.subjects?.some((s) => s.toLowerCase() === "fish"));
  });

  it("F2 leaping fish collapses to fish", () => {
    const profile = normalizeAi({
      subjects: ["leaping fish", "fish"],
      title: "Leaping Fish",
      description: "A leaping fish over waves.",
    });
    assert.ok(profile.subjects?.some((s) => s.toLowerCase() === "fish"));
    assert.ok(!profile.subjects?.some((s) => s.toLowerCase() === "leaping fish"));
  });

  it("F3 bass fish keeps fish, drops redundant phrase, relocates bass", () => {
    const profile = normalizeAi({
      subjects: ["bass fish", "fish"],
      title: "Bass Fish",
      description: "A bass fish illustration.",
    });
    assert.ok(profile.subjects?.some((s) => s.toLowerCase() === "fish"));
    assert.ok(!profile.subjects?.some((s) => s.toLowerCase() === "bass fish"));
    assert.ok(profile.subjects?.some((s) => s.toLowerCase() === "bass"));
    assert.ok(profile.searchConcepts?.some((s) => s.toLowerCase() === "bass"));
  });

  it("F4 slogan make fish is dropped even when description echoes visible text", () => {
    const profile = normalizeAi({
      subjects: ["make fish", "fish"],
      visibleText: ["I make fish come"],
      description: "I make fish come / an illustrated fish.",
      title: "I Make Fish Come Fish",
    });
    assert.ok(profile.subjects?.some((s) => s.toLowerCase() === "fish"));
    assert.ok(!profile.subjects?.some((s) => s.toLowerCase() === "make fish"));
    assert.ok(profile.visibleText?.some((line) => /make fish come/i.test(line)));
  });

  it("F5 fish + waves + ocean richness is preserved outside subjects", () => {
    const profile = normalizeAi({
      subjects: ["fish"],
      objects: ["waves"],
      places: ["ocean"],
      interests: ["fishing"],
      themes: ["fishing humor"],
    });
    assert.ok(profile.subjects?.some((s) => s.toLowerCase() === "fish"));
    assert.ok(profile.objects?.some((s) => s.toLowerCase() === "waves"));
    assert.ok(profile.places?.some((s) => s.toLowerCase() === "ocean"));
    assert.ok(profile.interests?.some((s) => s.toLowerCase() === "fishing"));
    assert.ok(profile.themes?.some((s) => /fishing/i.test(s)));
  });

  it("F6 depicted fisherman and fish both remain", () => {
    const profile = normalizeAi({
      subjects: ["fish", "fisherman"],
      title: "Fisherman With Fish",
      description: "A fisherman holding a fish.",
    });
    assert.ok(profile.subjects?.some((s) => s.toLowerCase() === "fish"));
    assert.ok(profile.subjects?.some((s) => s.toLowerCase() === "fisherman"));
  });

  it("F7 does not invent fisherman from fishing language", () => {
    const profile = normalizeAi({
      subjects: ["fish"],
      interests: ["fishing"],
      visibleText: ["Gone fishing"],
      description: "Gone fishing / illustrated fish.",
    });
    assert.ok(profile.subjects?.some((s) => s.toLowerCase() === "fish"));
    assert.ok(!profile.subjects?.some((s) => /fisherman|people/i.test(s)));
  });
});

describe("cross-domain derivative suppression and compound safety", () => {
  it("collapses running dog, floral cow, tired nurse, pink ghost, smiling pumpkin, vintage truck, watercolor flower, dancing skeleton", () => {
    const cases: Array<{ input: string[]; expect: string; forbid: string }> = [
      { input: ["running dog"], expect: "dog", forbid: "running dog" },
      { input: ["floral cow"], expect: "cow", forbid: "floral cow" },
      { input: ["tired nurse"], expect: "nurse", forbid: "tired nurse" },
      { input: ["pink ghost"], expect: "ghost", forbid: "pink ghost" },
      { input: ["smiling pumpkin"], expect: "pumpkin", forbid: "smiling pumpkin" },
      { input: ["vintage truck"], expect: "truck", forbid: "vintage truck" },
      { input: ["watercolor flowers"], expect: "flower", forbid: "watercolor flowers" },
      { input: ["dancing skeleton"], expect: "skeleton", forbid: "dancing skeleton" },
    ];
    for (const testCase of cases) {
      const profile = normalizeAi({ subjects: testCase.input });
      const subjects = profile.subjects ?? [];
      assert.ok(
        subjects.some((s) => s.toLowerCase() === testCase.expect || smartIncludes(subjects, testCase.expect)),
        `${testCase.input} => ${JSON.stringify(subjects)} missing ${testCase.expect}`,
      );
      assert.ok(!subjects.some((s) => s.toLowerCase() === testCase.forbid));
    }
  });

  it("preserves legitimate atomic compounds and does not last-token-strip them", () => {
    const compounds = [
      "highland cow",
      "sea turtle",
      "fire truck",
      "police officer",
      "hot air balloon",
      "Christmas tree",
      "ice cream",
    ];
    for (const phrase of compounds) {
      const profile = normalizeAi({
        subjects: [phrase],
        title: phrase,
        description: `A detailed illustration of a ${phrase}.`,
        centralSubject: phrase,
      });
      assert.ok(
        profile.subjects?.some((s) => s.toLowerCase() === phrase.toLowerCase()),
        `destroyed compound ${phrase}: ${JSON.stringify(profile.subjects)}`,
      );
    }
  });

  it("does not blindly collapse every multi-word subject to its last token", () => {
    const collapsed = collapseRedundantSubjectDerivatives({
      subjects: ["hot air balloon", "police officer"],
    });
    assert.ok(collapsed.subjects?.some((s) => s.toLowerCase() === "hot air balloon"));
    assert.ok(collapsed.subjects?.some((s) => s.toLowerCase() === "police officer"));
    assert.ok(!collapsed.subjects?.every((s) => !s.includes(" ")));
  });
});

function smartIncludes(subjects: string[], expected: string): boolean {
  return subjects.some((s) => s.toLowerCase().includes(expected));
}

describe("staff and preset paths skip AI derivative collapse", () => {
  it("normalizeSmartProfileDimensions keeps staff-entered leaping fish", () => {
    const staff = normalizeSmartProfileDimensions({ subjects: ["leaping fish"] });
    assert.deepEqual(staff.subjects, ["leaping fish"]);
  });

  it("normalizeSmartProfileDimensions keeps staff-entered OCR-like visibleText", () => {
    const dump = "182 (freely) I WILL ALWAYS LOVE YOU ____";
    const staff = normalizeSmartProfileDimensions({ visibleText: [dump] });
    assert.ok(staff.visibleText?.some((line) => /____/.test(line)));
  });

  it("AI collapse does not rewrite Dolly Parton import presets", () => {
    const ai = normalizeAi({ subjects: ["leaping fish"] });
    assert.ok(ai.subjects?.some((s) => s.toLowerCase() === "fish"));
    const merged = mergeSmartProfileImportPresets(
      {
        ...ai,
        provenance: ai.provenance,
      },
      { subjects: ["Dolly Parton"] },
    );
    assert.ok(merged.subjects?.includes("Dolly Parton"));
    assert.equal(merged.subjects?.[0], "Dolly Parton");
  });
});

describe("singular/plural still folds after collapse", () => {
  it("dedupes nurses and nurse via canonical key", () => {
    const profile = normalizeAi({ subjects: ["nurses", "nurse"] });
    const keys = (profile.subjects ?? []).map((s) => s.toLowerCase());
    assert.equal(keys.filter((s) => s === "nurse" || s === "nurses").length, 1);
  });
});
