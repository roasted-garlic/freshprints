import { after, before, beforeEach, describe, it } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Pairwise companionLinks rules + denorm fast path (2026-08-09 corrective).
 */

let environment: RulesTestEnvironment;

const OWNER = "owner-uid";
const DESIGN_A = "design-a";
const DESIGN_B = "design-b";
const DESIGN_D = "design-d";

function linkId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

function sortedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function baseDesign(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: `Design ${id}`,
    tags: ["turtle"],
    status: "ready",
    originalPath: `originals/${id}.png`,
    thumbnailPath: `thumbnails/${id}.webp`,
    previewPath: `previews/${id}.webp`,
    uploadedBy: OWNER,
    createdBy: OWNER,
    updatedBy: OWNER,
    queueCount: 0,
    aiProcessed: true,
    aiReviewed: true,
    aiReviewStatus: "approved",
    aiSuggestions: { title: "x", tags: ["a"], provider: "google", model: "m" },
    aiAnalysis: {},
    width: 1000,
    height: 1000,
    dpi: 300,
    printWidthInches: 10,
    printHeightInches: 10,
    printAspectRatioLocked: true,
    effectiveDpi: 300,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

before(async () => {
  const rules = readFileSync(path.resolve("firestore.rules"), "utf8");
  environment = await initializeTestEnvironment({
    projectId: "demo-fresh-prints-companion-links",
    firestore: { host: "127.0.0.1", port: 8080, rules },
  });
});

after(async () => {
  await environment.cleanup();
});

describe("companionLinks rules", () => {
  beforeEach(async () => {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "users", OWNER), { role: "owner", isActive: true });
      await setDoc(doc(db, "users", "helper"), { role: "helper", isActive: true });
      await setDoc(doc(db, "users", "customer"), { role: "customer", isActive: true });
    });
  });

  it("allows staff create of canonical pairwise link", async () => {
    const id = linkId(DESIGN_A, DESIGN_D);
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      setDoc(doc(db, "companionLinks", id), {
        id,
        designIds: sortedPair(DESIGN_A, DESIGN_D),
        createdBy: OWNER,
        updatedBy: OWNER,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it("denies customer read/create of companionLinks", async () => {
    const id = linkId(DESIGN_A, DESIGN_D);
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "companionLinks", id), {
        id,
        designIds: sortedPair(DESIGN_A, DESIGN_D),
        createdBy: OWNER,
        updatedBy: OWNER,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
    const customerDb = environment.authenticatedContext("customer").firestore();
    await assertFails(getDoc(doc(customerDb, "companionLinks", id)));
    await assertFails(
      setDoc(doc(customerDb, "companionLinks", linkId(DESIGN_B, DESIGN_D)), {
        id: linkId(DESIGN_B, DESIGN_D),
        designIds: sortedPair(DESIGN_B, DESIGN_D),
        createdBy: "customer",
        updatedBy: "customer",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it("denies update of companionLinks (immutable edges)", async () => {
    const id = linkId(DESIGN_A, DESIGN_D);
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "companionLinks", id), {
        id,
        designIds: sortedPair(DESIGN_A, DESIGN_D),
        createdBy: OWNER,
        updatedBy: OWNER,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertFails(
      updateDoc(doc(db, "companionLinks", id), {
        updatedBy: OWNER,
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it("allows staff delete of companionLinks", async () => {
    const id = linkId(DESIGN_A, DESIGN_D);
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "companionLinks", id), {
        id,
        designIds: sortedPair(DESIGN_A, DESIGN_D),
        createdBy: OWNER,
        updatedBy: OWNER,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
    const db = environment.authenticatedContext("helper").firestore();
    await assertSucceeds(deleteDoc(doc(db, "companionLinks", id)));
  });
});

describe("pairwise denorm fast path (companionDesignIds)", () => {
  beforeEach(async () => {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "users", OWNER), { role: "owner", isActive: true });
      await setDoc(
        doc(db, "designs", DESIGN_D),
        baseDesign(DESIGN_D, {
          companionDesignIds: [DESIGN_A, DESIGN_B],
          companionSetIncomplete: false,
          isExplicitContent: true,
          halftoneStaffDecision: {
            value: false,
            decidedBy: OWNER,
            isExplicitOverride: true,
            decidedAt: Timestamp.now(),
          },
        }),
      );
    });
  });

  it("allows unlink one neighbor via denorm-only update", async () => {
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "designs", DESIGN_D), {
        companionDesignIds: [DESIGN_A],
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("allows mark needs companion after clearing all neighbors", async () => {
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "designs", DESIGN_D), {
        companionDesignIds: deleteField(),
        companionSetIncomplete: true,
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("allows many-to-many: D already linked to A can also gain B (denorm)", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "designs", DESIGN_D),
        baseDesign(DESIGN_D, { companionDesignIds: [DESIGN_A] }),
      );
    });
    const db = environment.authenticatedContext(OWNER).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "designs", DESIGN_D), {
        companionDesignIds: [DESIGN_A, DESIGN_B],
        companionSetIncomplete: false,
        updatedBy: OWNER,
        updatedAt: serverTimestamp(),
      }),
    );
  });
});
