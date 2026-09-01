import { after, before, beforeEach, describe, it } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc, Timestamp, serverTimestamp } from "firebase/firestore";

/**
 * Regression: catalog approve after explicit/companion metadata on designs that already
 * carry a large AI enrichment `aiSuggestions` map.
 *
 * Root cause (2026-08-09): `clientAiFieldsUnchanged` deep-compared aiSuggestions/aiAnalysis,
 * exhausting the Firestore Rules 1000-expression limit on the ready transition.
 */

let environment: RulesTestEnvironment;

const OWNER = "owner-uid";
const DESIGN = "design-large-ai";

/** Synthetic enrichment payload sized like production catalog-enrich responses. */
function largeAiSuggestions(): Record<string, unknown> {
  return {
    promptVersion: "catalog-enrich-v26",
    tagRerankStatus: "succeeded",
    tagRerankEstimatedCostUsd: 0.0000614,
    promptTokens: 1244,
    tags: ["turtle", "funny", "sarcastic", "text", "animals", "meme", "green", "shirt"],
    provider: "google",
    title: "Large AI Suggestions Fixture Title For Rules Expression Budget",
    description:
      "A long description that mirrors production enrichment length so Rules evaluation " +
      "cost is realistic. Nested maps and lists previously caused deep-equality comparisons " +
      "to exceed the 1000 expression limit during catalog approval updates.",
    generatedAt: "2026-08-10T01:59:11.971Z",
    completionTokens: 171,
    tagRerankPromptVersion: "catalog-tag-rerank-v1",
    categoryName: "Funny & Sarcastic",
    estimatedCostUsd: 0.0001928,
    tagRerankCompletionTokens: 29,
    tagRerankPromptTokens: 498,
    suggestionAuthorStatus: "skipped",
    categoryId: "category-fixture-1",
    model: "gemini-2.5-flash-lite",
    alternateTitles: [
      "Alt title one for expression budget padding",
      "Alt title two for expression budget padding",
      "Alt title three for expression budget padding",
    ],
    tagScores: {
      turtle: 0.91,
      funny: 0.88,
      sarcastic: 0.84,
      text: 0.8,
      animals: 0.77,
      meme: 0.7,
    },
  };
}

function baseDesign(overrides: Record<string, unknown> = {}) {
  return {
    id: DESIGN,
    title: "Large AI Suggestions Design",
    tags: ["turtle", "funny"],
    status: "imported",
    originalPath: "originals/design-large-ai.png",
    thumbnailPath: "thumbnails/design-large-ai.webp",
    previewPath: "previews/design-large-ai.webp",
    uploadedBy: OWNER,
    createdBy: OWNER,
    updatedBy: OWNER,
    queueCount: 0,
    aiProcessed: true,
    aiReviewed: false,
    aiReviewStatus: "needs_review",
    aiProcessingStage: "ready_for_review",
    aiReviewVersion: "catalog-enrich-v26",
    aiSuggestions: largeAiSuggestions(),
    aiAnalysis: {},
    width: 4127,
    height: 2430,
    dpi: 300,
    printWidthInches: 13.76,
    printHeightInches: 8.1,
    printAspectRatioLocked: true,
    effectiveDpi: 300,
    printSizeSource: "import_normalized",
    wasUpscaled: false,
    upscaleFactor: 1,
    upscalePassCount: 0,
    sizingPolicyVersion: "image-quality-v2",
    approvedMaxPrintWidthInches: 13.76,
    approvedMaxPrintHeightInches: 8.1,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

async function seed(data: Record<string, unknown>) {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", OWNER), { role: "owner", isActive: true });
    await setDoc(doc(db, "designs", DESIGN), data);
  });
}

async function transitionReady() {
  const db = environment.authenticatedContext(OWNER).firestore();
  return updateDoc(doc(db, "designs", DESIGN), {
    status: "ready",
    aiReviewStatus: "approved",
    aiReviewed: true,
    aiProcessed: true,
    aiReviewedAt: serverTimestamp(),
    aiReviewedBy: OWNER,
    readyAt: serverTimestamp(),
    updatedBy: OWNER,
    updatedAt: serverTimestamp(),
  });
}

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: "demo-fresh-prints-approve-expression-budget",
    firestore: { host: "127.0.0.1", port: 8080, rules: undefined },
  });
});

after(async () => {
  await environment.cleanup();
});

describe("catalog approve with large aiSuggestions (expression budget)", () => {
  beforeEach(async () => {
    await environment.clearFirestore();
  });

  it("Sequence 1: isExplicitContent true then status ready ALLOW", async () => {
    await seed(baseDesign());
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "designs", DESIGN), {
        isExplicitContent: true,
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(transitionReady());
  });

  it("Sequence 2: companion denorm then status ready ALLOW", async () => {
    await seed(baseDesign());
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      setDoc(doc(db, "companionSets", "set-large-ai"), {
        id: "set-large-ai",
        memberDesignIds: [DESIGN],
        complete: false,
        createdBy: OWNER,
        updatedBy: OWNER,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(db, "designs", DESIGN), {
        companionSetId: "set-large-ai",
        companionSetIncomplete: true,
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(transitionReady());
  });

  it("Sequence 1+2 combined then status ready ALLOW", async () => {
    await seed(
      baseDesign({
        isExplicitContent: true,
        companionSetId: "set-combined",
        companionSetIncomplete: true,
      }),
    );
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "companionSets", "set-combined"), {
        id: "set-combined",
        memberDesignIds: [DESIGN],
        complete: false,
        createdBy: OWNER,
        updatedBy: OWNER,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
    await assertSucceeds(transitionReady());
  });

  it("AI Processing preview: artworkBackgroundHex-only on enrichment-heavy imported design ALLOW", async () => {
    await seed(
      baseDesign({
        aiReviewStatus: "pending",
        aiProcessingStage: "waiting",
      }),
    );
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "designs", DESIGN), {
        artworkBackgroundHex: "#2C2D2D",
        artworkBackgroundSource: "staff_manual",
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("AI Processing preview: halftone staff decision + tags on enrichment-heavy imported design ALLOW", async () => {
    await seed(
      baseDesign({
        aiReviewStatus: "pending",
        aiProcessingStage: "waiting",
      }),
    );
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "designs", DESIGN), {
        artworkBackgroundHex: "#2C2D2D",
        artworkBackgroundSource: "staff_manual",
        tags: ["turtle", "funny", "halftone"],
        halftoneStaffDecision: {
          value: true,
          decidedBy: OWNER,
          isExplicitOverride: true,
          decidedAt: Timestamp.now(),
        },
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("AI Review draft metadata (incl. halftoneStaffDecision + censoredTerms) then ready ALLOW", async () => {
    await seed(
      baseDesign({
        isExplicitContent: true,
        companionSetIncomplete: true,
        censoredTerms: ["fuck"],
      }),
    );
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "designs", DESIGN), {
        title: "Large AI Suggestions Design",
        description: "Draft description",
        categoryId: "category-fixture-1",
        tags: ["turtle", "funny", "halftone"],
        artworkBackgroundHex: "#222222",
        artworkBackgroundSource: "staff_manual",
        isExplicitContent: true,
        censoredTerms: ["fuck", "shit"],
        halftoneStaffDecision: {
          value: true,
          decidedBy: OWNER,
          isExplicitOverride: true,
          decidedAt: Timestamp.now(),
        },
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(transitionReady());
  });

  it("AI Review reject on enrichment-heavy imported design ALLOW", async () => {
    await seed(baseDesign());
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "designs", DESIGN), {
        status: "rejected",
        aiReviewStatus: "rejected",
        aiReviewed: false,
        aiProcessed: true,
        aiReviewedAt: serverTimestamp(),
        aiReviewedBy: OWNER,
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("Sequence 3 control: large aiSuggestions, no new fields → ready ALLOW", async () => {
    await seed(baseDesign());
    await assertSucceeds(transitionReady());
  });

  it("DENY forging aiProcessingStage on otherwise-valid ready transition", async () => {
    await seed(baseDesign());
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, "designs", DESIGN), {
        status: "ready",
        aiReviewStatus: "approved",
        aiReviewed: true,
        aiProcessed: true,
        aiReviewedAt: serverTimestamp(),
        aiReviewedBy: OWNER,
        readyAt: serverTimestamp(),
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
        aiProcessingStage: "forged_by_client",
      }),
    );
  });

  it("Edit Design catalog metadata (tags) on enrichment-heavy ready design ALLOW", async () => {
    await seed(
      baseDesign({
        status: "ready",
        aiReviewed: true,
        aiReviewStatus: "approved",
        isExplicitContent: true,
        companionDesignIds: ["peer-a", "peer-b"],
        companionSetIncomplete: false,
        artworkPlacement: "Left Chest",
        readyAt: Timestamp.now(),
      }),
    );
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "designs", DESIGN), {
        title: "Large AI Suggestions Design",
        description: "Updated description",
        categoryId: "category-fixture-1",
        tags: ["turtle", "funny", "featured-new"],
        artworkBackgroundHex: "#111111",
        artworkPlacement: "Left Chest",
        isExplicitContent: true,
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("DENY forging aiSuggestions through catalog-metadata-shaped write", async () => {
    await seed(
      baseDesign({
        status: "ready",
        aiReviewed: true,
        aiReviewStatus: "approved",
      }),
    );
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, "designs", DESIGN), {
        tags: ["turtle", "funny", "sneaky"],
        aiSuggestions: { forged: true },
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
  });
});
