import { after, before, beforeEach, describe, it } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc, Timestamp, serverTimestamp } from "firebase/firestore";

let environment: RulesTestEnvironment;

const OWNER = "owner-uid";
const CUSTOMER = "customer-uid";
const DESIGN = "design-smart-profile-import-presets-1";

function baseImportedDesign(overrides: Record<string, unknown> = {}) {
  return {
    id: DESIGN,
    title: "Smart Profile import presets (design test)",
    tags: ["cow"],
    status: "imported",
    originalPath: "originals/design-smart-profile-import-presets-1.png",
    thumbnailPath: "thumbnails/design-smart-profile-import-presets-1.webp",
    previewPath: "previews/design-smart-profile-import-presets-1.webp",
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

async function seedUsersAndDesign(data: Record<string, unknown>) {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", OWNER), { role: "owner", isActive: true });
    await setDoc(doc(db, "users", CUSTOMER), { role: "customer", isActive: true });
    await setDoc(doc(db, "designs", DESIGN), data);
  });
}

function transitionReadyFields(actorUid: string) {
  return {
    status: "ready",
    aiReviewStatus: "approved",
    aiReviewed: true,
    aiProcessed: true,
    aiReviewedAt: serverTimestamp(),
    aiReviewedBy: actorUid,
    readyAt: serverTimestamp(),
    updatedBy: actorUid,
    updatedAt: serverTimestamp(),
  };
}

async function transitionReady(actorUid: string, payload: Record<string, unknown> = {}) {
  const db = environment.authenticatedContext(actorUid).firestore();
  return updateDoc(doc(db, "designs", DESIGN), {
    ...transitionReadyFields(actorUid),
    ...payload,
  });
}

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: "demo-fresh-prints-smart-profile-import-presets",
    firestore: { host: "127.0.0.1", port: 8080, rules: undefined },
  });
});

after(async () => {
  await environment.cleanup();
});

describe("smartProfileImportPresets optional seed allowlist (Workstream B)", () => {
  beforeEach(async () => {
    await environment.clearFirestore();
  });

  it("allows authorized owner transition without smartProfileImportPresets", async () => {
    await seedUsersAndDesign(baseImportedDesign());
    await assertSucceeds(transitionReady(OWNER));
  });

  it("allows authorized owner transition with smartProfileImportPresets map", async () => {
    // Seed with the optional map already present so this test isolates the
    // allowlist/type contract (not the "add field for the first time" path).
    const presets = { subjects: ["Dolly Parton"] };
    await seedUsersAndDesign(
      baseImportedDesign({
        smartProfileImportPresets: presets,
      }),
    );
    // Include the field in the update payload so the rules validate `request.resource.data`.
    await assertSucceeds(transitionReady(OWNER, { smartProfileImportPresets: presets }));
  });

  it("denies owner transition when smartProfileImportPresets is not a map", async () => {
    await seedUsersAndDesign(baseImportedDesign());
    await assertFails(transitionReady(OWNER, { smartProfileImportPresets: "not-a-map" }));
  });

  it("denies customer attempt to transition designs with smartProfileImportPresets", async () => {
    await seedUsersAndDesign(baseImportedDesign());
    await assertFails(
      transitionReady(CUSTOMER, {
        smartProfileImportPresets: {
          subjects: ["Dolly Parton"],
        },
      }),
    );
  });

  it("denies customer attempting to mutate smartProfile (no ownership escalation via presets)", async () => {
    await seedUsersAndDesign(
      baseImportedDesign({
        smartProfileImportPresets: {
          subjects: ["Dolly Parton"],
        },
      }),
    );
    await assertFails(
      transitionReady(CUSTOMER, {
        smartProfile: {
          subjects: ["hacker"],
        },
      }),
    );
  });

  it("denies unrelated design field mutation (title) during the same transition", async () => {
    await seedUsersAndDesign(baseImportedDesign());
    await assertFails(
      transitionReady(OWNER, {
        title: "hacked title",
      }),
    );
  });
});

