import { after, before, beforeEach, describe, it } from "node:test";
import { readFileSync } from "node:fs";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, Timestamp } from "firebase/firestore";

let environment: RulesTestEnvironment;

const OWNER_UID = "owner-uid";
const HELPER_UID = "helper-uid";
const REQUEST_ID = "request-1";
const ITEM_ID = "catalog-item-1";
const DESIGN_ID = "design-1";

function catalogItem(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
    printRequestId: REQUEST_ID,
    designId: DESIGN_ID,
    quantity: 1,
    printWidthInches: 10.5,
    printHeightInches: 10.5,
    sizeLabel: "10.50 x 10.50 in",
    sortOrder: 0,
    status: "pending",
    addedBy: OWNER_UID,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

async function seedContext(options: { designStatus?: string } = {}) {
  await environment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await setDoc(doc(firestore, "users", OWNER_UID), { role: "owner", isActive: true });
    await setDoc(doc(firestore, "users", HELPER_UID), { role: "helper", isActive: true });
    await setDoc(doc(firestore, "printRequests", REQUEST_ID), {
      name: "Test request",
      isInternal: true,
      status: "active",
      itemCount: 0,
      createdBy: OWNER_UID,
      updatedBy: OWNER_UID,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(firestore, "designs", DESIGN_ID), {
      id: DESIGN_ID,
      title: "Library design",
      status: options.designStatus ?? "ready",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
}

describe("catalog printRequestItems create", () => {
  before(async () => {
    environment = await initializeTestEnvironment({
      projectId: "fresh-prints-catalog-item-create-rules",
      firestore: {
        rules: readFileSync("firestore.rules", "utf8"),
        host: "127.0.0.1",
        port: 8080,
      },
    });
  });

  after(async () => {
    await environment.cleanup();
  });

  beforeEach(async () => {
    await environment.clearFirestore();
    await seedContext();
  });

  it("allows staff to create a ready catalog print request item", async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(setDoc(doc(firestore, "printRequestItems", ITEM_ID), catalogItem()));
  });

  it("allows helpers to create a ready catalog print request item", async () => {
    const firestore = environment.authenticatedContext(HELPER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(firestore, "printRequestItems", ITEM_ID), catalogItem({ addedBy: HELPER_UID })),
    );
  });

  it("allows explicit catalog_design sourceType", async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      setDoc(
        doc(firestore, "printRequestItems", ITEM_ID),
        catalogItem({ sourceType: "catalog_design" }),
      ),
    );
  });

  it("denies create when design is not ready", async () => {
    await environment.clearFirestore();
    await seedContext({ designStatus: "draft" });
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertFails(setDoc(doc(firestore, "printRequestItems", ITEM_ID), catalogItem()));
  });

  it("denies create when staffArtworkId is mixed into a catalog item", async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      setDoc(
        doc(firestore, "printRequestItems", ITEM_ID),
        catalogItem({ staffArtworkId: "staff-art-1" }),
      ),
    );
  });
});
