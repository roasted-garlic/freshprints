import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  normalizeSimpleCatalogEnrichment,
  toCanonicalSimpleCatalogEnrichmentJson,
} from "./simpleCatalogEnrichmentResponse";
import { SMART_PROFILE_EDITABLE_DIMENSION_KEYS } from "../../../packages/shared/src/constants/smartProfile.constants";

describe("canonical enrichment response schema parity", () => {
  it("strips invented keys including prompt through the shared normalizer + canonical projector", () => {
    const raw = {
      title: "Retro Pin-Up Girl Holding Cucumber",
      description: "A vintage woman holding a cucumber with distressed slogan typography.",
      category: "Funny & Sarcastic",
      tags: [],
      readableTextLines: ["WHEN LIFE GIVES YOU CUCUMBERS"],
      centralSubject: "Retro pin-up girl with a cucumber",
      subjects: ["Woman"],
      objects: ["Cucumber"],
      styles: ["vintage"],
      themes: ["humor"],
      interests: [],
      professionsGroups: [],
      occasions: [],
      places: [],
      colors: ["blue"],
      searchConcepts: ["pin-up humor"],
      categoryAlternatives: [],
      categoryGapNote: "",
      halftoneShadowLikelihood: "none",
      halftoneShadowEvidence: "",
      prompt: "some artwork text that must never become schema",
      keywords: ["bad"],
      people: ["woman"],
      style_tags: ["retro"],
      mood_tags: ["funny"],
      color_palette: ["blue"],
      text_content: ["ignored"],
      visible_text: ["alias"],
    };

    const parsed = normalizeSimpleCatalogEnrichment(raw, []);
    const canonical = toCanonicalSimpleCatalogEnrichmentJson(parsed);

    assert.equal(canonical.title, "Retro Pin-Up Girl Holding Cucumber");
    assert.deepEqual(canonical.subjects, ["Woman"]);
    assert.deepEqual(canonical.objects, ["Cucumber"]);
    assert.equal(Object.prototype.hasOwnProperty.call(canonical, "prompt"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(canonical, "keywords"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(canonical, "people"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(canonical, "style_tags"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(canonical, "mood_tags"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(canonical, "color_palette"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(canonical, "text_content"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(canonical, "visible_text"), false);
  });

  it("Playground runtime path canonicalizes through the same helpers as production", () => {
    const playground = readFileSync(resolve(import.meta.dirname, "aiEnrichmentPlayground.ts"), "utf8");
    assert.match(playground, /normalizeSimpleCatalogEnrichment/);
    assert.match(playground, /toCanonicalSimpleCatalogEnrichmentJson/);
    assert.match(playground, /outputText: canonicalOutputText/);
  });

  it("Gemini/OpenAI dual provider uses the same normalizer (no Playground-only aliases)", () => {
    const gemini = readFileSync(
      resolve(import.meta.dirname, "providers/geminiVisionEnrichmentProvider.ts"),
      "utf8",
    );
    assert.match(gemini, /normalizeSimpleCatalogEnrichment/);
    assert.match(gemini, /extractJsonObject/);
    assert.match(gemini, /buildSimpleCatalogEnrichmentResponseFormat/);
  });
});

describe("prompt output field rejection", () => {
  it("Design Details Smart Profile presentation has no prompt attribute and no Prompt version footer", () => {
    for (const key of SMART_PROFILE_EDITABLE_DIMENSION_KEYS) {
      assert.notEqual(key, "prompt");
    }
    const display = readFileSync(
      resolve(
        import.meta.dirname,
        "../../../apps/studio/src/renderer/src/features/designs/utils/smartProfileDisplay.ts",
      ),
      "utf8",
    );
    assert.doesNotMatch(display, /label:\s*"Prompt"/);
    assert.doesNotMatch(display, /Prompt version/);
    assert.match(display, /Profile version/);
    assert.match(display, /Normalizer version/);
    // promptVersion remains on provenance types, but Design Details footer intentionally omits it.
    assert.doesNotMatch(display, /promptVersion/);
  });

  it("dimension lists view only iterates editable Smart Profile keys", () => {
    const view = readFileSync(
      resolve(
        import.meta.dirname,
        "../../../apps/studio/src/renderer/src/features/designs/components/SmartProfileDimensionListsView.tsx",
      ),
      "utf8",
    );
    assert.match(view, /SMART_PROFILE_EDITABLE_DIMENSION_KEYS\.map/);
    assert.doesNotMatch(view, /Object\.keys\(profile\)/);
  });
});
