import { after, before, beforeEach, describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc, Timestamp, serverTimestamp, deleteField } from "firebase/firestore";

/**
 * Studio 1.0.4 smoke Defect B: soft-archive of enrichment-heavy rejected designs.
 *
 * Without `designArchiveStatusOnlyUpdate`, archive falls through approval diff + full
 * `designRequiredFieldsValid` and denies as permission-denied (expression budget).
 */

let environment: RulesTestEnvironment;

const OWNER = "owner-uid";
const HELPER = "helper-uid";
const CUSTOMER = "customer-uid";
const DESIGN = "design-archive-large-ai";

function largeAiSuggestions(): Record<string, unknown> {
  return {
    promptVersion: "catalog-enrich-v26",
    tagRerankStatus: "succeeded",
    tagRerankEstimatedCostUsd: 0.0000614,
    promptTokens: 1244,
    tags: ["turtle", "funny", "sarcastic", "text", "animals", "meme", "green", "shirt"],
    provider: "google",
    title: "Large AI Suggestions Fixture Title For Rules Expression Budget Archive",
    description:
      "A long description that mirrors production enrichment length so Rules evaluation " +
      "cost is realistic for rejected→archived soft-archive updates.",
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

function baseRejectedDesign(overrides: Record<string, unknown> = {}) {
  return {
    id: DESIGN,
    title: "Large AI Rejected Design",
    tags: ["turtle", "funny"],
    status: "rejected",
    originalPath: "originals/design-archive-large-ai.png",
    thumbnailPath: "thumbnails/design-archive-large-ai.webp",
    previewPath: "previews/design-archive-large-ai.webp",
    uploadedBy: OWNER,
    createdBy: OWNER,
    updatedBy: OWNER,
    queueCount: 0,
    aiProcessed: true,
    aiReviewed: true,
    aiReviewStatus: "rejected",
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
    isExplicitContent: true,
    companionDesignIds: ["peer-a", "peer-b"],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

function archivePayload(actorUid: string, previousStatus: string) {
  return {
    status: "archived",
    previousStatus,
    archivedAt: serverTimestamp(),
    archivedBy: actorUid,
    updatedAt: serverTimestamp(),
    updatedBy: actorUid,
  };
}

function restorePayload(actorUid: string, status: string) {
  return {
    status,
    previousStatus: deleteField(),
    archivedAt: deleteField(),
    archivedBy: deleteField(),
    updatedAt: serverTimestamp(),
    updatedBy: actorUid,
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
    projectId: "demo-fresh-prints-design-archive",
    firestore: { host: "127.0.0.1", port: 8080, rules: undefined },
  });
});

after(async () => {
  await environment.cleanup();
});

describe("design soft-archive fast path (expression budget)", () => {
  beforeEach(async () => {
    await environment.clearFirestore();
  });

  it("enrichment-heavy rejected → archived ALLOW for owner", async () => {
    await seedUsersAndDesign(baseRejectedDesign());
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(updateDoc(doc(db, "designs", DESIGN), archivePayload(OWNER, "rejected")));
  });

  it("enrichment-heavy rejected → archived ALLOW for helper", async () => {
    await seedUsersAndDesign(baseRejectedDesign());
    const db = environment.authenticatedContext(HELPER).firestore();
    await assertSucceeds(updateDoc(doc(db, "designs", DESIGN), archivePayload(HELPER, "rejected")));
  });

  it("enrichment-heavy ready → archived ALLOW for owner", async () => {
    await seedUsersAndDesign(
      baseRejectedDesign({
        status: "ready",
        aiReviewStatus: "approved",
        readyAt: Timestamp.now(),
      }),
    );
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(updateDoc(doc(db, "designs", DESIGN), archivePayload(OWNER, "ready")));
  });

  it("DENY previousStatus mismatch", async () => {
    await seedUsersAndDesign(baseRejectedDesign());
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, "designs", DESIGN), archivePayload(OWNER, "ready")));
  });

  it("DENY forged archivedBy", async () => {
    await seedUsersAndDesign(baseRejectedDesign());
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, "designs", DESIGN), {
        ...archivePayload(OWNER, "rejected"),
        archivedBy: HELPER,
      }),
    );
  });

  it("DENY AI payload mutation during archive", async () => {
    await seedUsersAndDesign(baseRejectedDesign());
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, "designs", DESIGN), {
        ...archivePayload(OWNER, "rejected"),
        aiSuggestions: { forged: true },
      }),
    );
  });

  it("DENY purge field mutation during archive", async () => {
    await seedUsersAndDesign(baseRejectedDesign());
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, "designs", DESIGN), {
        ...archivePayload(OWNER, "rejected"),
        assetsPurgedAt: serverTimestamp(),
        assetsPurgedBy: OWNER,
      }),
    );
  });

  it("DENY unrelated field mutation during archive", async () => {
    await seedUsersAndDesign(baseRejectedDesign());
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, "designs", DESIGN), {
        ...archivePayload(OWNER, "rejected"),
        title: "sneaky title change",
      }),
    );
  });

  it("DENY arbitrary status transition via archive-shaped keys", async () => {
    await seedUsersAndDesign(baseRejectedDesign({ status: "imported", aiReviewed: false }));
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, "designs", DESIGN), {
        status: "ready",
        previousStatus: "imported",
        archivedAt: serverTimestamp(),
        archivedBy: OWNER,
        updatedAt: serverTimestamp(),
        updatedBy: OWNER,
      }),
    );
  });

  it("DENY customer archive", async () => {
    await seedUsersAndDesign(baseRejectedDesign());
    const db = environment.authenticatedContext(CUSTOMER).firestore();
    await assertFails(updateDoc(doc(db, "designs", DESIGN), archivePayload(CUSTOMER, "rejected")));
  });

  it("restore authorization unchanged: helper cannot restore archived design", async () => {
    await seedUsersAndDesign(
      baseRejectedDesign({
        status: "archived",
        previousStatus: "rejected",
        archivedAt: Timestamp.now(),
        archivedBy: OWNER,
      }),
    );
    const db = environment.authenticatedContext(HELPER).firestore();
    await assertFails(updateDoc(doc(db, "designs", DESIGN), restorePayload(HELPER, "rejected")));
  });

  it("enrichment-heavy archived → rejected ALLOW for owner (restore fast path)", async () => {
    await seedUsersAndDesign(
      baseRejectedDesign({
        status: "archived",
        previousStatus: "rejected",
        archivedAt: Timestamp.now(),
        archivedBy: OWNER,
      }),
    );
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(updateDoc(doc(db, "designs", DESIGN), restorePayload(OWNER, "rejected")));
  });

  it("enrichment-heavy archived → ready ALLOW for owner when previousStatus is ready", async () => {
    await seedUsersAndDesign(
      baseRejectedDesign({
        status: "archived",
        previousStatus: "ready",
        aiReviewStatus: "approved",
        readyAt: Timestamp.now(),
        archivedAt: Timestamp.now(),
        archivedBy: OWNER,
      }),
    );
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(updateDoc(doc(db, "designs", DESIGN), restorePayload(OWNER, "ready")));
  });

  it("DENY restore when status does not match previousStatus", async () => {
    await seedUsersAndDesign(
      baseRejectedDesign({
        status: "archived",
        previousStatus: "rejected",
        archivedAt: Timestamp.now(),
        archivedBy: OWNER,
      }),
    );
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, "designs", DESIGN), restorePayload(OWNER, "ready")));
  });
});

describe("pre-corrective archive deny (rules without designArchiveStatusOnlyUpdate)", () => {
  let legacyEnvironment: RulesTestEnvironment;

  before(async () => {
    const rulesPath = resolve(process.cwd(), "firestore.rules");
    let rules = readFileSync(rulesPath, "utf8");
    // Prove enrichment-heavy archive fails without the corrective fast path.
    rules = rules.replace(
      /\|\|\s*designArchiveStatusOnlyUpdate\(\)/g,
      "|| false /* archive fast path removed for regression */",
    );
    legacyEnvironment = await initializeTestEnvironment({
      projectId: "demo-fresh-prints-design-archive-legacy",
      firestore: { host: "127.0.0.1", port: 8080, rules },
    });
  });

  after(async () => {
    await legacyEnvironment.cleanup();
  });

  beforeEach(async () => {
    await legacyEnvironment.clearFirestore();
  });

  it("enrichment-heavy rejected → archived DENY without archive fast path", async () => {
    await legacyEnvironment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "users", OWNER), { role: "owner", isActive: true });
      await setDoc(doc(db, "designs", DESIGN), baseRejectedDesign());
    });
    const db = legacyEnvironment.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, "designs", DESIGN), archivePayload(OWNER, "rejected")));
  });
});

describe("pre-corrective restore deny (rules without designRestoreStatusOnlyUpdate)", () => {
  let legacyRestoreEnvironment: RulesTestEnvironment;

  before(async () => {
    const rulesPath = resolve(process.cwd(), "firestore.rules");
    let rules = readFileSync(rulesPath, "utf8");
    rules = rules.replace(
      /\|\|\s*designRestoreStatusOnlyUpdate\(\)/g,
      "|| false /* restore fast path removed for regression */",
    );
    legacyRestoreEnvironment = await initializeTestEnvironment({
      projectId: "demo-fresh-prints-design-restore-legacy",
      firestore: { host: "127.0.0.1", port: 8080, rules },
    });
  });

  after(async () => {
    await legacyRestoreEnvironment.cleanup();
  });

  beforeEach(async () => {
    await legacyRestoreEnvironment.clearFirestore();
  });

  it("enrichment-heavy archived → rejected DENY without restore fast path", async () => {
    await legacyRestoreEnvironment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "users", OWNER), { role: "owner", isActive: true });
      await setDoc(
        doc(db, "designs", DESIGN),
        baseRejectedDesign({
          status: "archived",
          previousStatus: "rejected",
          archivedAt: Timestamp.now(),
          archivedBy: OWNER,
        }),
      );
    });
    const db = legacyRestoreEnvironment.authenticatedContext(OWNER).firestore();
    await assertFails(updateDoc(doc(db, "designs", DESIGN), restorePayload(OWNER, "rejected")));
  });
});
