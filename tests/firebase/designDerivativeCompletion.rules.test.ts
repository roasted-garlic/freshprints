import { after, before, beforeEach, describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc, Timestamp, serverTimestamp } from "firebase/firestore";

/**
 * Studio 1.0.4 P4: markDesignDerivativesComplete mutation
 * (processing|imported → imported + canonical thumbnailPath/previewPath).
 *
 * Without `designDerivativeCompletionUpdate`, the write falls through approval diff + full
 * `designRequiredFieldsValid` and denies as permission-denied (packaged DEV diagnostic).
 */

let environment: RulesTestEnvironment;

const OWNER = "owner-uid";
const HELPER = "helper-uid";
const CUSTOMER = "customer-uid";
const DESIGN = "design-deriv-complete-p4";

function largeAiSuggestions(): Record<string, unknown> {
  return {
    promptVersion: "catalog-enrich-v26",
    tagRerankStatus: "succeeded",
    tagRerankEstimatedCostUsd: 0.0000614,
    promptTokens: 1244,
    tags: ["turtle", "funny", "sarcastic", "text", "animals", "meme", "green", "shirt"],
    provider: "google",
    title: "Large AI Suggestions Fixture Title For Rules Expression Budget Derivative Completion",
    description:
      "A long description that mirrors production enrichment length so Rules evaluation " +
      "cost is realistic for processing→imported derivative path persistence.",
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

/** Import-shaped / enrichment-heavy design as seen after Studio create + markDesignProcessing. */
function baseProcessingDesign(overrides: Record<string, unknown> = {}) {
  return {
    id: DESIGN,
    title: "grace",
    tags: [],
    status: "processing",
    originalPath: `/originals/${DESIGN}.png`,
    thumbnailPath: "",
    uploadedBy: OWNER,
    createdBy: OWNER,
    updatedBy: OWNER,
    queueCount: 0,
    aiProcessed: false,
    aiReviewed: false,
    aiReviewStatus: "pending",
    width: 3500,
    height: 4200,
    dpi: 300,
    printWidthInches: 11.67,
    printHeightInches: 14,
    printAspectRatioLocked: true,
    effectiveDpi: 300,
    printSizeSource: "import_normalized",
    wasUpscaled: false,
    upscaleFactor: 1,
    upscalePassCount: 0,
    sizingPolicyVersion: "image-quality-v2",
    aiSuggestions: largeAiSuggestions(),
    aiAnalysis: {},
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

function derivativeCompletionPayload(
  actorUid: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    status: "imported",
    thumbnailPath: `/thumbnails/${DESIGN}.webp`,
    previewPath: `/previews/${DESIGN}.webp`,
    updatedAt: serverTimestamp(),
    updatedBy: actorUid,
    ...overrides,
  };
}

async function seedUsersAndDesign(data: Record<string, unknown>) {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", OWNER), { role: "owner", isActive: true });
    await setDoc(doc(db, "users", HELPER), { role: "helper", isActive: true });
    await setDoc(doc(db, "users", CUSTOMER), { role: "customer", isActive: true });
    await setDoc(doc(db, "designs", DESIGN), data);
  });
}

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: "demo-fresh-prints-design-deriv-complete",
    firestore: { host: "127.0.0.1", port: 8080, rules: undefined },
  });
});

after(async () => {
  await environment.cleanup();
});

describe("designDerivativeCompletionUpdate ALLOW", () => {
  beforeEach(async () => {
    await environment.clearFirestore();
  });

  it("processing → imported + canonical paths ALLOW for helper", async () => {
    await seedUsersAndDesign(baseProcessingDesign());
    const db = environment.authenticatedContext(HELPER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "designs", DESIGN), derivativeCompletionPayload(HELPER)),
    );
  });

  it("imported → imported derivative completion ALLOW for owner", async () => {
    await seedUsersAndDesign(baseProcessingDesign({ status: "imported", thumbnailPath: "" }));
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "designs", DESIGN), derivativeCompletionPayload(OWNER)),
    );
  });

  it("optional createdBy heal when missing ALLOW", async () => {
    const withoutCreatedBy = { ...baseProcessingDesign() };
    delete withoutCreatedBy.createdBy;
    await seedUsersAndDesign(withoutCreatedBy);
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "designs", DESIGN), {
        ...derivativeCompletionPayload(OWNER),
        createdBy: OWNER,
      }),
    );
  });
});

describe("designDerivativeCompletionUpdate DENY", () => {
  beforeEach(async () => {
    await environment.clearFirestore();
  });

  it("DENY ready → imported derivative completion", async () => {
    await seedUsersAndDesign(baseProcessingDesign({ status: "ready", aiReviewStatus: "approved" }));
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, "designs", DESIGN), derivativeCompletionPayload(OWNER)));
  });

  it("DENY rejected → imported", async () => {
    await seedUsersAndDesign(baseProcessingDesign({ status: "rejected", aiReviewed: true }));
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, "designs", DESIGN), derivativeCompletionPayload(OWNER)));
  });

  it("DENY archived → imported", async () => {
    await seedUsersAndDesign(
      baseProcessingDesign({
        status: "archived",
        previousStatus: "imported",
        archivedAt: Timestamp.now(),
        archivedBy: OWNER,
      }),
    );
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, "designs", DESIGN), derivativeCompletionPayload(OWNER)));
  });

  it("DENY unknown/legacy queued source state", async () => {
    await seedUsersAndDesign(baseProcessingDesign({ status: "queued" }));
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, "designs", DESIGN), derivativeCompletionPayload(OWNER)));
  });

  it("DENY wrong thumbnail path", async () => {
    await seedUsersAndDesign(baseProcessingDesign());
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(
        doc(db, "designs", DESIGN),
        derivativeCompletionPayload(OWNER, { thumbnailPath: "/thumbnails/other-id.webp" }),
      ),
    );
  });

  it("DENY wrong preview path", async () => {
    await seedUsersAndDesign(baseProcessingDesign());
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(
        doc(db, "designs", DESIGN),
        derivativeCompletionPayload(OWNER, { previewPath: "/previews/other-id.webp" }),
      ),
    );
  });

  it("DENY empty derivative paths", async () => {
    await seedUsersAndDesign(baseProcessingDesign());
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(
        doc(db, "designs", DESIGN),
        derivativeCompletionPayload(OWNER, { thumbnailPath: "", previewPath: "" }),
      ),
    );
  });

  it("DENY originalPath modification", async () => {
    await seedUsersAndDesign(baseProcessingDesign());
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, "designs", DESIGN), {
        ...derivativeCompletionPayload(OWNER),
        originalPath: `/originals/${DESIGN}-forged.png`,
      }),
    );
  });

  it("DENY title modification bundled into same write", async () => {
    await seedUsersAndDesign(baseProcessingDesign());
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, "designs", DESIGN), {
        ...derivativeCompletionPayload(OWNER),
        title: "sneaky title",
      }),
    );
  });

  it("DENY tags/category modification bundled into same write", async () => {
    await seedUsersAndDesign(baseProcessingDesign());
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, "designs", DESIGN), {
        ...derivativeCompletionPayload(OWNER),
        tags: ["forged"],
        categoryId: "forged-cat",
      }),
    );
  });

  it("DENY AI fields modification bundled into same write", async () => {
    await seedUsersAndDesign(baseProcessingDesign());
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, "designs", DESIGN), {
        ...derivativeCompletionPayload(OWNER),
        aiSuggestions: { forged: true },
        aiProcessingStage: "queued",
      }),
    );
  });

  it("DENY purge fields modification", async () => {
    await seedUsersAndDesign(baseProcessingDesign());
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, "designs", DESIGN), {
        ...derivativeCompletionPayload(OWNER),
        assetsPurgedAt: serverTimestamp(),
        assetsPurgedBy: OWNER,
      }),
    );
  });

  it("DENY customer caller", async () => {
    await seedUsersAndDesign(baseProcessingDesign());
    const db = environment.authenticatedContext(CUSTOMER).firestore();
    await assertFails(updateDoc(doc(db, "designs", DESIGN), derivativeCompletionPayload(CUSTOMER)));
  });

  it("DENY unauthenticated caller", async () => {
    await seedUsersAndDesign(baseProcessingDesign());
    const db = environment.unauthenticatedContext().firestore();
    await assertFails(updateDoc(doc(db, "designs", DESIGN), derivativeCompletionPayload(OWNER)));
  });

  it("DENY spoofed updatedBy", async () => {
    await seedUsersAndDesign(baseProcessingDesign());
    const db = environment.authenticatedContext(HELPER).firestore();
    await assertFails(
      updateDoc(doc(db, "designs", DESIGN), derivativeCompletionPayload(OWNER)),
    );
  });

  it("DENY purged design repopulating derivative paths", async () => {
    await seedUsersAndDesign(
      baseProcessingDesign({
        assetsPurgedAt: Timestamp.now(),
        assetsPurgedBy: OWNER,
      }),
    );
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, "designs", DESIGN), derivativeCompletionPayload(OWNER)));
  });

  it("DENY inactive staff", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "users", OWNER), { role: "owner", isActive: true });
      await setDoc(doc(db, "users", HELPER), { role: "helper", isActive: false });
      await setDoc(doc(db, "designs", DESIGN), baseProcessingDesign());
    });
    const db = environment.authenticatedContext(HELPER).firestore();
    await assertFails(updateDoc(doc(db, "designs", DESIGN), derivativeCompletionPayload(HELPER)));
  });
});

describe("pre-corrective derivative completion DENY (rules without designDerivativeCompletionUpdate)", () => {
  let legacyEnvironment: RulesTestEnvironment;

  before(async () => {
    const rulesPath = resolve(process.cwd(), "firestore.rules");
    let rules = readFileSync(rulesPath, "utf8");
    rules = rules.replace(
      /\|\|\s*designDerivativeCompletionUpdate\(\)/g,
      "|| false /* derivative completion fast path removed for P4 regression */",
    );
    legacyEnvironment = await initializeTestEnvironment({
      projectId: "demo-fresh-prints-design-deriv-complete-legacy",
      firestore: { host: "127.0.0.1", port: 8080, rules },
    });
  });

  after(async () => {
    await legacyEnvironment.cleanup();
  });

  beforeEach(async () => {
    await legacyEnvironment.clearFirestore();
  });

  it("enrichment-heavy processing → imported + paths DENY without derivative fast path", async () => {
    await legacyEnvironment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "users", OWNER), { role: "owner", isActive: true });
      await setDoc(doc(db, "designs", DESIGN), baseProcessingDesign());
    });
    const db = legacyEnvironment.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, "designs", DESIGN), derivativeCompletionPayload(OWNER)));
  });
});
