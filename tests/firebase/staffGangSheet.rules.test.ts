/**
 * Staff Gang Sheet Rules — shared sheet create/update and Portal isolation.
 */
import { after, before, beforeEach, describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, Timestamp, updateDoc } from "firebase/firestore";

let environment: RulesTestEnvironment;

const OWNER_UID = "owner-uid";
const HELPER_A = "helper-a";
const HELPER_B = "helper-b";
const CUSTOMER_UID = "customer-uid";

function whatnotShow(overrides: Record<string, unknown> = {}) {
  return {
    source: "whatnot",
    whatnotShowId: "whatnot-1",
    status: "scheduled",
    syncStatus: "idle",
    isArchived: false,
    productionStatus: "open",
    maxQuantityOverridden: false,
    allocatedQuantity: 0,
    createdBy: OWNER_UID,
    updatedBy: OWNER_UID,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

function staffGangSheet(overrides: Record<string, unknown> = {}) {
  return {
    source: "staff_gang_sheet",
    title: "Staff Gang Sheet #1",
    status: "scheduled",
    syncStatus: "idle",
    isArchived: false,
    productionStatus: "open",
    maxQuantityOverridden: false,
    allocatedQuantity: 0,
    staffGangSheetCycleNumber: 1,
    createdBy: OWNER_UID,
    updatedBy: OWNER_UID,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

describe("Staff Gang Sheet firestore rules", () => {
  before(async () => {
    const rules = readFileSync(path.resolve("firestore.rules"), "utf8");
    environment = await initializeTestEnvironment({
      projectId: "fresh-prints-staff-gang-sheet-rules",
      firestore: { rules },
    });
  });

  after(async () => {
    await environment.cleanup();
  });

  beforeEach(async () => {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "users", OWNER_UID), { role: "owner", isActive: true });
      await setDoc(doc(db, "users", HELPER_A), { role: "helper", isActive: true });
      await setDoc(doc(db, "users", HELPER_B), { role: "helper", isActive: true });
      await setDoc(doc(db, "users", CUSTOMER_UID), { role: "customer", isActive: true });
    });
  });

  it("preserves Whatnot required whatnotShowId on create", async () => {
    const owner = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(setDoc(doc(owner, "upcomingShows", "wn-1"), whatnotShow()));
    await assertFails(
      setDoc(doc(owner, "upcomingShows", "wn-bad"), whatnotShow({ whatnotShowId: "" })),
    );
  });

  it("allows owner to create shared Staff Gang Sheet without assignee or whatnotShowId", async () => {
    const owner = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(setDoc(doc(owner, "upcomingShows", "sgs-1"), staffGangSheet()));
  });

  it("denies Staff Gang Sheet create that includes assignee or whatnotShowId", async () => {
    const owner = environment.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      setDoc(
        doc(owner, "upcomingShows", "sgs-bad-assignee"),
        staffGangSheet({ assignedStaffUserId: HELPER_A }),
      ),
    );
    await assertFails(
      setDoc(
        doc(owner, "upcomingShows", "sgs-bad-id"),
        staffGangSheet({ whatnotShowId: "fake" }),
      ),
    );
  });

  it("allows helper to create shared Staff Gang Sheet", async () => {
    const helper = environment.authenticatedContext(HELPER_A).firestore();
    await assertSucceeds(
      setDoc(
        doc(helper, "upcomingShows", "sgs-helper-create"),
        staffGangSheet({
          maxTotalQuantity: 200,
          updatedBy: HELPER_A,
          createdBy: HELPER_A,
        }),
      ),
    );
  });

  it("allows any helper to update the shared Staff Gang Sheet but not change cycle", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "upcomingShows", "sgs-1"), staffGangSheet());
    });

    const helperA = environment.authenticatedContext(HELPER_A).firestore();
    await assertSucceeds(
      updateDoc(doc(helperA, "upcomingShows", "sgs-1"), {
        allocatedQuantity: 2,
        updatedBy: HELPER_A,
        updatedAt: Timestamp.now(),
      }),
    );

    const helperB = environment.authenticatedContext(HELPER_B).firestore();
    await assertSucceeds(
      updateDoc(doc(helperB, "upcomingShows", "sgs-1"), {
        allocatedQuantity: 3,
        updatedBy: HELPER_B,
        updatedAt: Timestamp.now(),
      }),
    );

    await assertFails(
      updateDoc(doc(helperA, "upcomingShows", "sgs-1"), {
        staffGangSheetCycleNumber: 2,
        updatedBy: HELPER_A,
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it("denies converting Whatnot ↔ Staff Gang Sheet", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "upcomingShows", "wn-1"), whatnotShow());
      await setDoc(doc(db, "upcomingShows", "sgs-1"), staffGangSheet());
    });

    const owner = environment.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      updateDoc(doc(owner, "upcomingShows", "wn-1"), {
        source: "staff_gang_sheet",
        staffGangSheetCycleNumber: 1,
        updatedBy: OWNER_UID,
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it("denies customer read/write of Staff Gang Sheets", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "upcomingShows", "sgs-1"), staffGangSheet());
    });

    const customer = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertFails(updateDoc(doc(customer, "upcomingShows", "sgs-1"), { notes: "nope" }));
  });
});
