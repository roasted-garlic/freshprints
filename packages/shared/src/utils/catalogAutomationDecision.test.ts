import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SMART_PROFILE_VERSION } from "../types/catalog/smartProfile.types";
import {
  computeCatalogAutomationDecision,
  computeShadowAutomationDecision,
} from "./catalogAutomationDecision";
import {
  detectSubjectSpecificityRisk,
  findStructuredEvidenceGaps,
  promoteSubjectsWithTitleSpecificity,
  sanitizeSyntheticSubjectCompounds,
} from "./catalogAutomationEvidence";

function baseProfile(overrides: Record<string, unknown> = {}) {
  return {
    subjects: ["raccoon"],
    provenance: {
      version: SMART_PROFILE_VERSION,
      generatedAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

describe("catalogAutomationEvidence", () => {
  it("flags people subject without supporting evidence (Jimothy-like)", () => {
    const gaps = findStructuredEvidenceGaps({
      subjects: ["people", "raccoon"],
      title: "Jimothy the Raccoon",
      description: "A raccoon holding coffee.",
      visibleText: [],
    });
    assert.ok(gaps.some((gap) => gap.token === "people"));
    assert.ok(!gaps.some((gap) => gap.token === "raccoon"));
  });

  it("does not flag people when title/description support people", () => {
    const gaps = findStructuredEvidenceGaps({
      subjects: ["people"],
      title: "Friends Group Photo",
      description: "A group of people celebrating together.",
      visibleText: [],
    });
    assert.equal(gaps.length, 0);
  });

  it("matches daisy object against daisies description (safe plural)", () => {
    const gaps = findStructuredEvidenceGaps({
      subjects: [],
      objects: ["daisy"],
      title: "Peace Love Scrubs",
      description: "Decorative elements include a peace sign, daisies, hearts, and stethoscope.",
      visibleText: ["PEACE", "LOVE", "SCRUBS"],
    });
    assert.equal(gaps.length, 0);
  });

  it("detects Highland-style subject specificity risk", () => {
    const risk = detectSubjectSpecificityRisk({
      title: "Highland Cow Portrait",
      subjects: ["cow"],
    });
    assert.equal(risk, "subject_specificity_risk:cow");
  });

  it("clears specificity risk when highland cow already in subjects", () => {
    const risk = detectSubjectSpecificityRisk({
      title: "Highland Cow Portrait",
      subjects: ["highland cow", "cow"],
    });
    assert.equal(risk, null);
  });

  it("promotes highland cow from title when subjects only have cow", () => {
    const promoted = promoteSubjectsWithTitleSpecificity({
      title: "Highland Cow With Bow",
      subjects: ["cow"],
    });
    assert.deepEqual(promoted?.[0]?.toLowerCase(), "highland cow");
    assert.ok(promoted?.includes("cow"));
  });

  it("does not promote bass fish or leaping fish as required specificity", () => {
    const bassPromoted = promoteSubjectsWithTitleSpecificity({
      title: "Bass Fish Artwork",
      description: "An illustrated bass fish leaping from water.",
      subjects: ["fish"],
    });
    assert.ok(bassPromoted?.some((s) => s.toLowerCase() === "fish"));
    assert.ok(!bassPromoted?.some((s) => s.toLowerCase() === "bass fish"));
    assert.ok(!bassPromoted?.some((s) => s.toLowerCase() === "leaping fish"));

    const leapingRisk = detectSubjectSpecificityRisk({
      title: "Leaping Fish",
      description: "A leaping fish over waves.",
      subjects: ["fish"],
    });
    assert.equal(leapingRisk, null);
  });

  it("promotes highland cow from description when title lacks specificity", () => {
    const promoted = promoteSubjectsWithTitleSpecificity({
      title: "Artwork Design",
      description:
        "A cartoon illustration of a cute, wide-eyed Highland cow wearing a bow.",
      subjects: ["cow"],
    });
    assert.ok(promoted?.some((s) => s.toLowerCase() === "highland cow"));
  });

  it("does not promote problem skeleton from slogan title glue", () => {
    const promoted = promoteSubjectsWithTitleSpecificity({
      title: "THAT SOUNDS LIKE MY HUSBAND'S PROBLEM Skeleton",
      visibleText: ["THAT SOUNDS LIKE", "MY", "HUSBAND'S", "PROBLEM"],
      subjects: ["skeleton"],
    });
    assert.ok(promoted?.includes("skeleton"));
    assert.ok(!promoted?.some((s) => s.toLowerCase() === "problem skeleton"));
  });

  it("does not promote coochie alligator from slogan title glue", () => {
    const promoted = promoteSubjectsWithTitleSpecificity({
      title: "HOTTER THAN A HOOCHIE COOCHIE Alligator",
      visibleText: ["HOTTER", "THAN A HOOCHIE", "COOCHIE"],
      subjects: ["alligator"],
    });
    assert.ok(promoted?.includes("alligator"));
    assert.ok(!promoted?.some((s) => /coochie/.test(s.toLowerCase())));
  });

  it("does not promote f-caw-f raven from hyphenated slogan token", () => {
    const promoted = promoteSubjectsWithTitleSpecificity({
      title: "F-CAW-F Raven",
      visibleText: ["F-CAW-F"],
      subjects: ["raven"],
    });
    assert.ok(promoted?.includes("raven"));
    assert.ok(!promoted?.some((s) => /f-caw-f/.test(s.toLowerCase())));
  });

  it("does not promote bath skeleton from slogan title glue", () => {
    const promoted = promoteSubjectsWithTitleSpecificity({
      title: "LIVE LAUGH TOASTER BATH Skeleton",
      visibleText: ["LIVE, LAUGH", "TOASTER BATH"],
      subjects: ["skeleton"],
    });
    assert.ok(!promoted?.some((s) => s.toLowerCase() === "bath skeleton"));
  });

  it("strips donald goofy redundant character merge", () => {
    const cleaned = sanitizeSyntheticSubjectCompounds({
      subjects: [
        "donald goofy",
        "Mickey Mouse",
        "Minnie Mouse",
        "Daisy Duck",
        "Donald Duck",
        "Goofy",
      ],
      title: "GIGI Disney Characters",
      description: "Mickey Mouse, Minnie Mouse, Daisy Duck, Donald Duck, and Goofy surround GIGI.",
    });
    assert.ok(!cleaned?.some((s) => s.toLowerCase() === "donald goofy"));
    assert.ok(cleaned?.some((s) => s.toLowerCase() === "donald duck"));
    assert.ok(cleaned?.some((s) => s.toLowerCase() === "goofy"));
  });

  it("keeps frankenstein's monster / schnauzer / chimpanzee / raccoon specificity", () => {
    for (const phrase of [
      "frankenstein's monster",
      "schnauzer dog",
      "chimpanzee",
      "raccoon",
    ]) {
      const kept = sanitizeSyntheticSubjectCompounds({
        subjects: [phrase],
        title: phrase,
        description: `A detailed illustration of a ${phrase}.`,
      });
      assert.ok(kept?.some((s) => s.toLowerCase() === phrase));
    }
  });

  it("flags title-only multi-word glue subjects as evidence gaps", () => {
    const gaps = findStructuredEvidenceGaps({
      subjects: ["problem skeleton", "skeleton"],
      title: "THAT SOUNDS LIKE MY HUSBAND'S PROBLEM Skeleton",
      description: "A skeleton wearing sunglasses holding a drink.",
      visibleText: ["THAT SOUNDS LIKE", "MY", "HUSBAND'S PROBLEM"],
    });
    assert.ok(gaps.some((gap) => gap.token.toLowerCase() === "problem skeleton"));
    assert.ok(!gaps.some((gap) => gap.token.toLowerCase() === "skeleton"));
  });
});

describe("computeCatalogAutomationDecision", () => {
  it("missing mode path is exercised via manual — no auto publish", () => {
    const result = computeCatalogAutomationDecision({
      smartProfile: baseProfile(),
      title: "Trash Panda Coffee",
      categoryId: "animals",
      description: "A raccoon holding coffee.",
      catalogWorkflowMode: "manual",
      catalogAutonomousLiveEnabled: false,
    });
    assert.equal(result.shouldPublishReady, false);
    assert.equal(result.decision, "needs_review");
    assert.equal(result.wouldAutoApprove, false);
  });

  it("shadow never publishes ready", () => {
    const result = computeCatalogAutomationDecision({
      smartProfile: baseProfile(),
      title: "Trash Panda Coffee",
      categoryId: "animals",
      description: "A raccoon holding coffee.",
      catalogWorkflowMode: "shadow",
      catalogAutonomousLiveEnabled: false,
    });
    assert.equal(result.shouldPublishReady, false);
    assert.equal(result.decision, "shadow");
    assert.equal(result.wouldAutoApprove, true);
  });

  it("autonomous + live OFF does not publish", () => {
    const result = computeCatalogAutomationDecision({
      smartProfile: baseProfile(),
      title: "Trash Panda Coffee",
      categoryId: "animals",
      description: "A raccoon holding coffee.",
      catalogWorkflowMode: "autonomous",
      catalogAutonomousLiveEnabled: false,
    });
    assert.equal(result.shouldPublishReady, false);
    assert.equal(result.decision, "shadow");
    assert.equal(result.wouldAutoApprove, true);
  });

  it("autonomous + live ON publishes when policy clear", () => {
    const result = computeCatalogAutomationDecision({
      smartProfile: baseProfile(),
      title: "Trash Panda Coffee",
      categoryId: "animals",
      description: "A raccoon holding coffee.",
      catalogWorkflowMode: "autonomous",
      catalogAutonomousLiveEnabled: true,
    });
    assert.equal(result.shouldPublishReady, true);
    assert.equal(result.decision, "auto_approved");
  });

  it("Jimothy-like people gap blocks via verifier unresolved", () => {
    const result = computeCatalogAutomationDecision({
      smartProfile: baseProfile({ subjects: ["people", "raccoon"] }),
      title: "Jimothy the Raccoon",
      categoryId: "animals",
      description: "A raccoon holding coffee.",
      visibleText: [],
      catalogWorkflowMode: "autonomous",
      catalogAutonomousLiveEnabled: true,
    });
    assert.equal(result.shouldPublishReady, false);
    assert.equal(result.decision, "needs_review");
    assert.equal(result.verifier.invoked, true);
    assert.equal(result.verifier.outcome, "unresolved");
    assert.ok(result.reasonCodes.some((c) => c.includes("people")));
  });

  it("unsupported person on glove/mic artwork blocks unattended approval", () => {
    const result = computeCatalogAutomationDecision({
      smartProfile: baseProfile({ subjects: ["person"] }),
      title: "(33)",
      categoryId: "pop",
      categoryName: "Pop Culture & Characters",
      description:
        "A sequined, rhinestone-covered glove holds a crystal-encrusted microphone. The signature Michael Jackson is scripted below.",
      visibleText: ["Michael Jackson"],
      catalogWorkflowMode: "shadow",
      catalogAutonomousLiveEnabled: false,
    });
    assert.equal(result.wouldAutoApprove, false);
    assert.ok(
      result.reasonCodes.some((c) => c.includes("structured_evidence_gap:subjects:person")),
    );
  });

  it("ambiguous creature dog without evidence blocks unattended approval", () => {
    const result = computeCatalogAutomationDecision({
      smartProfile: baseProfile({
        subjects: ["furry creature", "dog-like creature", "girl", "dog", "creature"],
      }),
      title: "Girl With Companions",
      categoryId: "animals",
      categoryName: "Animals",
      description:
        "A black and white illustration featuring a girl with braided hair and two cartoonish animal companions.",
      catalogWorkflowMode: "shadow",
      catalogAutonomousLiveEnabled: false,
    });
    assert.equal(result.wouldAutoApprove, false);
    assert.ok(result.reasonCodes.some((c) => c.includes("structured_evidence_gap:subjects:dog")));
  });

  it("fantasy/storybook Floral & Nature conflict blocks shadow would-auto-approve", () => {
    const result = computeCatalogAutomationDecision({
      smartProfile: baseProfile({
        subjects: [],
        themes: ["fantasy", "nature", "storytelling", "imagination"],
        interests: ["reading", "nature", "fantasy"],
        places: ["fantasy landscape"],
        searchConcepts: [
          "magical book",
          "story book",
          "fantasy world",
          "mushroom forest",
          "enchanted forest",
          "fairy tale book",
          "adventure book",
        ],
        categoryName: "Floral & Nature",
      }),
      title: "(8)",
      categoryId: "floral",
      categoryName: "Floral & Nature",
      description:
        "An open book unfolds into a vibrant fantasy landscape filled with large mushrooms, colorful flowers, and a castle.",
      catalogWorkflowMode: "shadow",
      catalogAutonomousLiveEnabled: false,
    });
    assert.equal(result.wouldAutoApprove, false);
    assert.equal(result.decision, "needs_review");
    assert.ok(result.hardBlockers.includes("category_dominant_intent_conflict"));
    assert.ok(result.reasonCodes.includes("category_dominant_intent_conflict"));
    assert.ok(!result.reasonCodes.includes("shadow_would_auto_approve"));
  });

  it("text-driven empty subjects remain eligible for shadow approve", () => {
    const result = computeCatalogAutomationDecision({
      smartProfile: baseProfile({
        subjects: [],
        themes: ["faith", "humor"],
        interests: ["christianity"],
        visibleText: ["jesus saves.", "I spend."],
      }),
      title: "jesus saves. I spend.",
      categoryId: "faith",
      categoryName: "Faith & Inspirational",
      description: 'The design features the phrases "jesus saves." and "I spend."',
      visibleText: ["jesus saves.", "I spend."],
      catalogWorkflowMode: "shadow",
      catalogAutonomousLiveEnabled: false,
    });
    assert.equal(result.wouldAutoApprove, true);
    assert.equal(result.decision, "shadow");
  });

  it("category gap remains needs review", () => {
    const result = computeCatalogAutomationDecision({
      smartProfile: baseProfile({
        subjects: ["raccoon"],
        categoryGapSuggested: true,
        categoryGapEvidence: "No approved category fits this local travel raccoon mascot.",
      }),
      title: "Jimothy Seattle",
      description: "A raccoon walking near the Space Needle.",
      catalogWorkflowMode: "shadow",
      catalogAutonomousLiveEnabled: false,
    });
    assert.equal(result.wouldAutoApprove, false);
    assert.ok(result.hardBlockers.includes("category_gap_suggested"));
  });

  it("genuine people subject is not inherently invalid", () => {
    const result = computeCatalogAutomationDecision({
      smartProfile: baseProfile({ subjects: ["people"] }),
      title: "Friends Group Photo",
      categoryId: "people",
      description: "A group of people celebrating together.",
      catalogWorkflowMode: "autonomous",
      catalogAutonomousLiveEnabled: true,
    });
    assert.equal(result.shouldPublishReady, true);
    assert.equal(result.decision, "auto_approved");
    assert.ok(!result.reasonCodes.some((c) => c.includes("structured_evidence_gap:subjects:people")));
  });

  it("category unresolved is a hard blocker", () => {
    const result = computeCatalogAutomationDecision({
      smartProfile: baseProfile(),
      title: "Short Title",
      description: "A raccoon with coffee.",
      catalogWorkflowMode: "shadow",
      catalogAutonomousLiveEnabled: false,
    });
    assert.equal(result.decision, "needs_review");
    assert.ok(result.hardBlockers.includes("category_unresolved"));
  });

  it("shadow wrapper remains compatible", () => {
    const result = computeShadowAutomationDecision({
      smartProfile: baseProfile(),
      title: "Trash Panda Coffee",
      categoryId: "animals",
      description: "A raccoon holding coffee.",
    });
    assert.equal(result.decision, "shadow");
    assert.ok(result.reasonCodes.includes("shadow_would_auto_approve"));
  });
});
