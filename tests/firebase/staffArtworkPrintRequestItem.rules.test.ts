import { after, before, beforeEach, describe, it } from "node:test";
import { readFileSync } from "node:fs";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, doc, getDocs, getDoc, orderBy, query, setDoc, updateDoc, where, Timestamp } from "firebase/firestore";

let environment: RulesTestEnvironment;

const OWNER_UID = "owner-uid";
const HELPER_UID = "helper-uid";
const CUSTOMER_UID = "customer-uid";
const CUSTOMER_ID = "customer-1";
const REQUEST_ID = "request-1";
const ITEM_ID = "staff-item-1";
const STAFF_ARTWORK_ID = "staff-art-1";

function staffArtworkItem(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
    printRequestId: REQUEST_ID,
    sourceType: "staff_artwork",
    staffArtworkId: STAFF_ARTWORK_ID,
    titleSnapshot: "15c5d4d82e",
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

async function seedContext(options: { artworkStatus?: string } = {}) {
  await environment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await setDoc(doc(firestore, "users", OWNER_UID), { role: "owner", isActive: true });
    await setDoc(doc(firestore, "users", HELPER_UID), { role: "helper", isActive: true });
    await setDoc(doc(firestore, "users", CUSTOMER_UID), { role: "customer", isActive: true });
    await setDoc(doc(firestore, "customers", CUSTOMER_ID), { userId: CUSTOMER_UID, username: "customer" });
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
    await setDoc(doc(firestore, "staffArtworks", STAFF_ARTWORK_ID), {
      id: STAFF_ARTWORK_ID,
      title: "15c5d4d82e",
      status: options.artworkStatus ?? "ready",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
}

describe("staff artwork printRequestItems create", () => {
  before(async () => {
    environment = await initializeTestEnvironment({
      projectId: "fresh-prints-staff-artwork-item-rules",
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

  it("allows staff to create a ready Staff Artwork print request item", async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(setDoc(doc(firestore, "printRequestItems", ITEM_ID), staffArtworkItem()));
  });

  it("allows helpers to create a ready Staff Artwork print request item", async () => {
    const firestore = environment.authenticatedContext(HELPER_UID).firestore();
    await assertSucceeds(
      setDoc(
        doc(firestore, "printRequestItems", ITEM_ID),
        staffArtworkItem({ addedBy: HELPER_UID }),
      ),
    );
  });

  it("denies create when Staff Artwork is not ready", async () => {
    await environment.clearFirestore();
    await seedContext({ artworkStatus: "processing" });
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertFails(setDoc(doc(firestore, "printRequestItems", ITEM_ID), staffArtworkItem()));
  });

  it("denies create when print size exceeds 22 inches", async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      setDoc(
        doc(firestore, "printRequestItems", ITEM_ID),
        staffArtworkItem({
          printWidthInches: 24,
          printHeightInches: 24,
          sizeLabel: "24.00 x 24.00 in",
        }),
      ),
    );
  });

  it("denies customer reads of canonical items and Staff Artwork, but allows the safe projection", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await setDoc(doc(firestore, "printRequests", REQUEST_ID), {
        customerId: CUSTOMER_ID,
        requestOrigin: "portal_customer",
        isInternal: false,
        status: "draft",
        itemCount: 1,
      });
      await setDoc(doc(firestore, "portalPrintRequestItems", ITEM_ID), {
        id: ITEM_ID,
        printRequestId: REQUEST_ID,
        sourceType: "staff_artwork",
        sourceLabel: "Staff-added",
        quantity: 1,
        status: "pending",
        addedBy: CUSTOMER_UID,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
    const firestore = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertFails(getDoc(doc(firestore, "printRequestItems", ITEM_ID)));
    await assertFails(getDoc(doc(firestore, "staffArtworks", STAFF_ARTWORK_ID)));
    await assertSucceeds(getDoc(doc(firestore, "portalPrintRequestItems", ITEM_ID)));
    await assertSucceeds(
      getDocs(
        query(
          collection(firestore, "portalPrintRequestItems"),
          where("printRequestId", "==", REQUEST_ID),
          orderBy("updatedAt", "desc"),
        ),
      ),
    );
  });

  it("denies direct customer Staff Artwork item updates", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await setDoc(doc(firestore, "printRequests", REQUEST_ID), {
        customerId: CUSTOMER_ID,
        requestOrigin: "portal_customer",
        isInternal: false,
        status: "draft",
        itemCount: 1,
      });
      await setDoc(doc(firestore, "printRequestItems", ITEM_ID), staffArtworkItem({
        printRequestId: REQUEST_ID,
      }));
    });
    const firestore = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertFails(updateDoc(doc(firestore, "printRequestItems", ITEM_ID), {
      printWidthInches: 11,
      printHeightInches: 11,
      updatedAt: Timestamp.now(),
    }));
  });
});
