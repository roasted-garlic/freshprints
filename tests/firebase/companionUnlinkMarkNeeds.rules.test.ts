import { after, before, beforeEach, describe, it } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  updateDoc,
  deleteField,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Repro: after unlink, Mark needs companion / Link fail with permission-denied
 * on the Mating-shaped ready design (owner QA 2026-08-09). Updated for pairwise
 * companionDesignIds / companionLinks (2026-08-09 overnight corrective).
 */

let environment: RulesTestEnvironment;

const OWNER = "4gxOZTsGmxfZIA28mxNF2Hh46fY2";
const MATING = "8SB5cjSHJMYRvfl2npE2";
const FUCKING = "rdM12xCaaOh3S5MIYQyw";
const SET_ID = "MK9fLZR7lGRLWis6N7bg";

function matingShaped(overrides: Record<string, unknown> = {}) {
  return {
    id: MATING,
    title: "There's Two Turtles Mating On The Back Of My Shirt",
    tags: ["turtle", "funny", "sarcastic", "distressed"],
    status: "ready",
    originalPath: "originals/8SB5cjSHJMYRvfl2npE2.png",
    thumbnailPath: "thumbnails/8SB5cjSHJMYRvfl2npE2.webp",
    previewPath: "previews/8SB5cjSHJMYRvfl2npE2.webp",
    uploadedBy: OWNER,
    createdBy: OWNER,
    updatedBy: OWNER,
    queueCount: 0,
    aiProcessed: true,
    aiReviewed: true,
    aiReviewStatus: "approved",
    aiProcessingStage: "ready_for_review",
    aiReviewVersion: "catalog-enrich-v26",
    aiReviewedAt: Timestamp.now(),
    aiReviewedBy: OWNER,
    readyAt: Timestamp.now(),
    aiSuggestions: {
      title: "There's Two Turtles Mating On The Back Of My Shirt",
      description: "The design features the text THERE'S TWO TURTLES MATING...",
      tags: ["turtle", "funny", "sarcastic", "distressed"],
      provider: "google",
      model: "gemini-2.5-flash-lite",
      promptVersion: "catalog-enrich-v26",
      generatedAt: "2026-08-10T03:31:07.842Z",
      promptTokens: 1244,
      completionTokens: 203,
      estimatedCostUsd: 0.0002056,
      suggestionAuthorStatus: "skipped",
      tagRerankStatus: "succeeded",
      tagRerankPromptTokens: 525,
      tagRerankCompletionTokens: 27,
      tagRerankEstimatedCostUsd: 0.0000633,
      tagRerankPromptVersion: "catalog-tag-rerank-v1",
      categoryName: "Funny & Sarcastic",
      categoryId: "tj0HemRh2RuYLfI7N6nO",
    },
    aiAnalysis: {},
    isExplicitContent: false,
    halftoneStaffDecision: {
      value: false,
      decidedBy: OWNER,
      isExplicitOverride: true,
      decidedAt: Timestamp.now(),
    },
    width: 4127,
    height: 2430,
    dpi: 300,
    printWidthInches: 13.76,
    printHeightInches: 8.1,
    printAspectRatioLocked: true,
    effectiveDpi: 300,
    printSizeSource: "import_normalized",
    metadataDpiX: 300,
    metadataDpiY: 300,
    categoryId: "tj0HemRh2RuYLfI7N6nO",
    description: "desc",
    requestCount: 0,
    lastRequestedAt: Timestamp.now(),
    approvedMaxPrintWidthInches: 13.76,
    approvedMaxPrintHeightInches: 8.1,
    sizingPolicyVersion: "image-quality-v2",
    wasUpscaled: false,
    upscaleFactor: 1,
    upscalePassCount: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

before(async () => {
  const rules = readFileSync(path.resolve("firestore.rules"), "utf8");
  environment = await initializeTestEnvironment({
    projectId: "demo-fresh-prints-companion-unlink-repro",
    firestore: { host: "127.0.0.1", port: 8080, rules },
  });
});

after(async () => {
  await environment.cleanup();
});

describe("companion unlink then mark-needs / link (Mating-shaped)", () => {
  beforeEach(async () => {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "users", OWNER), { role: "owner", isActive: true });
      await setDoc(
        doc(db, "designs", MATING),
        matingShaped({
          companionSetId: SET_ID,
          companionSetIncomplete: false,
        }),
      );
      await setDoc(doc(db, "designs", FUCKING), {
        ...matingShaped({
          id: FUCKING,
          title: "There's Two Turtles Fucking On The Back Of My Shirt",
          companionSetId: SET_ID,
          companionSetIncomplete: false,
          isExplicitContent: true,
        }),
      });
      await setDoc(doc(db, "companionSets", SET_ID), {
        id: SET_ID,
        memberDesignIds: [MATING, FUCKING, "other-member"],
        complete: true,
        createdBy: OWNER,
        updatedBy: OWNER,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
  });

  it("allows unlink clear of companion denorm on Mating-shaped design", async () => {
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "designs", MATING), {
        companionSetId: deleteField(),
        companionSetIncomplete: deleteField(),
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("allows mark needs companion after unlink clear", async () => {
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "designs", MATING), {
        companionSetId: deleteField(),
        companionSetIncomplete: deleteField(),
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(db, "designs", MATING), {
        companionSetIncomplete: true,
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("allows Case A pairwise link denorm after unlink (companionDesignIds)", async () => {
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "designs", MATING), {
        companionSetId: deleteField(),
        companionDesignIds: deleteField(),
        companionSetIncomplete: deleteField(),
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(db, "designs", FUCKING), {
        companionSetId: deleteField(),
        companionDesignIds: deleteField(),
        companionSetIncomplete: deleteField(),
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );

    const pairId = MATING < FUCKING ? `${MATING}_${FUCKING}` : `${FUCKING}_${MATING}`;
    const designIds = MATING < FUCKING ? [MATING, FUCKING] : [FUCKING, MATING];
    await assertSucceeds(
      setDoc(doc(db, "companionLinks", pairId), {
        id: pairId,
        designIds,
        createdBy: OWNER,
        updatedBy: OWNER,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(db, "designs", MATING), {
        companionDesignIds: [FUCKING],
        companionSetIncomplete: false,
        companionSetId: deleteField(),
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("denies smuggling status changes through the companion denorm fast path", async () => {
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "designs", MATING), {
        companionSetId: deleteField(),
        companionSetIncomplete: deleteField(),
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(db, "designs", MATING), {
        companionSetIncomplete: true,
        status: "archived",
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("allows Placement-only update on enrichment-heavy ready design (expression-budget fast path)", async () => {
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "designs", MATING), {
        artworkPlacement: "back",
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(db, "designs", MATING), {
        artworkPlacement: deleteField(),
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("denies smuggling status through the Placement-only fast path", async () => {
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, "designs", MATING), {
        artworkPlacement: "front",
        status: "archived",
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
  });
});
