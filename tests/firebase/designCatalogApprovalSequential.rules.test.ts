import { after, before, beforeEach, describe, it } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc, Timestamp, serverTimestamp } from "firebase/firestore";

/**
 * Sequential persisted-state Rules diagnosis for catalog approval after
 * isExplicitContent / companion denorm writes (owner QA 2026-08-09).
 */

let environment: RulesTestEnvironment;

const OWNER = "owner-uid";
const DESIGN = "design-seq-1";

function baseImportedDesign(overrides: Record<string, unknown> = {}) {
  return {
    id: DESIGN,
    title: "Sequential Rules Design",
    tags: ["cow"],
    status: "imported",
    originalPath: "originals/design-seq-1.png",
    thumbnailPath: "thumbnails/design-seq-1.webp",
    previewPath: "previews/design-seq-1.webp",
    uploadedBy: OWNER,
    createdBy: OWNER,
    updatedBy: OWNER,
    queueCount: 0,
    aiProcessed: true,
    aiReviewed: false,
    aiReviewStatus: "needs_review",
    aiProcessingStage: "ready_for_review",
    width: 1000,
    height: 1000,
    dpi: 300,
    printWidthInches: 4,
    printHeightInches: 4,
    printAspectRatioLocked: true,
    effectiveDpi: 250,
    printSizeSource: "import_normalized",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

async function seedDesign(data: Record<string, unknown>) {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", OWNER), { role: "owner", isActive: true });
    await setDoc(doc(db, "designs", DESIGN), data);
  });
}

async function writeExplicitTrue() {
  const db = environment.authenticatedContext(OWNER).firestore();
  await updateDoc(doc(db, "designs", DESIGN), {
    isExplicitContent: true,
    updatedBy: OWNER,
    updatedAt: serverTimestamp(),
  });
}

async function writeCompanionDenorm() {
  const db = environment.authenticatedContext(OWNER).firestore();
  await setDoc(doc(db, "companionSets", "set-seq-1"), {
    id: "set-seq-1",
    memberDesignIds: [DESIGN],
    complete: false,
    createdBy: OWNER,
    updatedBy: OWNER,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  await updateDoc(doc(db, "designs", DESIGN), {
    companionSetId: "set-seq-1",
    companionSetIncomplete: true,
    updatedBy: OWNER,
    updatedAt: serverTimestamp(),
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
    projectId: "demo-fresh-prints-sequential-approve",
    firestore: { host: "127.0.0.1", port: 8080, rules: undefined },
  });
});

after(async () => {
  await environment.cleanup();
});

describe("sequential catalog approval after new metadata", () => {
  beforeEach(async () => {
    await environment.clearFirestore();
    await seedDesign(baseImportedDesign());
  });

  it("Sequence 3 control: no new fields → status ready ALLOW", async () => {
    await assertSucceeds(transitionReady());
  });

  it("Sequence 1: isExplicitContent true then status ready", async () => {
    await assertSucceeds(writeExplicitTrue());
    // This is the owner-observed failure mode.
    await assertSucceeds(transitionReady());
  });

  it("Sequence 2: companion denorm then status ready", async () => {
    await assertSucceeds(writeCompanionDenorm());
    await assertSucceeds(transitionReady());
  });

  it("Sequence 1b: isExplicitContent false then status ready ALLOW", async () => {
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "designs", DESIGN), {
        isExplicitContent: false,
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(transitionReady());
  });

  it("Sequence 1+2 combined then status ready", async () => {
    await assertSucceeds(writeExplicitTrue());
    await assertSucceeds(writeCompanionDenorm());
    await assertSucceeds(transitionReady());
  });
});
