import { after, before, beforeEach, describe, it } from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, Timestamp, updateDoc } from "firebase/firestore";

/**
 * Production resize denial reproduction:
 * catalog printRequestItems stamped with requestCountApplied by onPrintRequestItemCreated
 * must remain client-updatable for size (staff + customer) without allowing marker mutation.
 */

let environment: RulesTestEnvironment;

const OWNER_UID = "owner-uid";
const CUSTOMER_UID = "customer-uid";
const CUSTOMER_DOC_ID = "customer-1";
const REQUEST_ID = "request-1";
const ITEM_ID = "item-1";
const DESIGN_ID = "design-ready-1";
const UPLOAD_ITEM_ID = "item-upload-1";
const UPLOAD_ID = "upload-1";

function baseCatalogItem(options: { requestCountApplied?: boolean } = {}) {
  return {
    id: ITEM_ID,
    printRequestId: REQUEST_ID,
    designId: DESIGN_ID,
    sourceType: "catalog_design",
    quantity: 1,
    printWidthInches: 4,
    printHeightInches: 4,
    sizeLabel: '4" × 4"',
    status: "pending",
    addedBy: CUSTOMER_UID,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...(options.requestCountApplied ? { requestCountApplied: true } : {}),
  };
}

function baseUploadItem() {
  return {
    id: UPLOAD_ITEM_ID,
    printRequestId: REQUEST_ID,
    sourceType: "customer_upload",
    customerUploadId: UPLOAD_ID,
    titleSnapshot: "Customer art",
    quantity: 1,
    printWidthInches: 4,
    printHeightInches: 4,
    sizeLabel: '4" × 4"',
    status: "pending",
    addedBy: CUSTOMER_UID,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

async function seedEditableCatalogContext(options: {
  requestCountApplied?: boolean;
  requestStatus?: string;
} = {}): Promise<void> {
  await environment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await setDoc(doc(firestore, "users", OWNER_UID), { role: "owner", isActive: true });
    await setDoc(doc(firestore, "users", CUSTOMER_UID), { role: "customer", isActive: true });
    await setDoc(doc(firestore, "customers", CUSTOMER_DOC_ID), {
      id: CUSTOMER_DOC_ID,
      userId: CUSTOMER_UID,
      displayName: "Test Customer",
      username: "testcustomer",
      isGuest: false,
      totalPrintRequests: 0,
      nextPrintRequestSequence: 1,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(firestore, "designs", DESIGN_ID), {
      id: DESIGN_ID,
      title: "Ready design",
      tags: [],
      status: "ready",
      originalPath: `${DESIGN_ID}.png`,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(doc(firestore, "printRequests", REQUEST_ID), {
      name: "Working request",
      customerId: CUSTOMER_DOC_ID,
      isInternal: false,
      requestOrigin: "portal_customer",
      status: options.requestStatus ?? "draft",
      itemCount: 1,
      createdBy: CUSTOMER_UID,
      updatedBy: CUSTOMER_UID,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await setDoc(
      doc(firestore, "printRequestItems", ITEM_ID),
      baseCatalogItem({ requestCountApplied: options.requestCountApplied }),
    );
  });
}

async function seedUploadItem(): Promise<void> {
  await seedEditableCatalogContext({});
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "printRequestItems", UPLOAD_ITEM_ID), baseUploadItem());
  });
}

function sizePatch(extra: Record<string, unknown> = {}) {
  return {
    printWidthInches: 5,
    printHeightInches: 5,
    sizeLabel: '5" × 5"',
    updatedAt: Timestamp.now(),
    ...extra,
  };
}

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: "demo-fresh-prints-item-resize-rules",
    firestore: { host: "127.0.0.1", port: 8080, rules: undefined },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
});

after(async () => {
  await environment.cleanup();
});

describe("printRequestItems size update — requestCountApplied allowlist", () => {
  it("allows staff size update when requestCountApplied marker is present and unchanged", async () => {
    await seedEditableCatalogContext({ requestCountApplied: true });
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(firestore, "printRequestItems", ITEM_ID), sizePatch({ quantity: 1 })),
    );
  });

  it("allows customer size update when requestCountApplied marker is present and unchanged", async () => {
    await seedEditableCatalogContext({ requestCountApplied: true });
    const firestore = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertSucceeds(updateDoc(doc(firestore, "printRequestItems", ITEM_ID), sizePatch()));
  });

  it("allows staff and customer size update when marker is absent (upload-like / pre-stamp)", async () => {
    await seedEditableCatalogContext({ requestCountApplied: false });
    const staff = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(staff, "printRequestItems", ITEM_ID), sizePatch({ quantity: 1 })),
    );
    await environment.clearFirestore();
    await seedEditableCatalogContext({ requestCountApplied: false });
    const customer = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertSucceeds(updateDoc(doc(customer, "printRequestItems", ITEM_ID), sizePatch()));
  });

  it("allows customer size update on upload-backed items without the marker", async () => {
    await seedUploadItem();
    const firestore = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertSucceeds(updateDoc(doc(firestore, "printRequestItems", UPLOAD_ITEM_ID), sizePatch()));
  });

  it("denies staff clearing or flipping requestCountApplied during size update", async () => {
    await seedEditableCatalogContext({ requestCountApplied: true });
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      updateDoc(doc(firestore, "printRequestItems", ITEM_ID), sizePatch({
        quantity: 1,
        requestCountApplied: false,
      })),
    );
  });

  it("denies customer clearing requestCountApplied during size update", async () => {
    await seedEditableCatalogContext({ requestCountApplied: true });
    const firestore = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertFails(
      updateDoc(doc(firestore, "printRequestItems", ITEM_ID), sizePatch({
        requestCountApplied: false,
      })),
    );
  });

  it("denies customer size update when parent request is queued (not draft/editing)", async () => {
    await seedEditableCatalogContext({
      requestCountApplied: true,
      requestStatus: "queued",
    });
    const firestore = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertFails(updateDoc(doc(firestore, "printRequestItems", ITEM_ID), sizePatch()));
  });

  it("allows customer size update with standardSizePresetKey when marker is present", async () => {
    await seedEditableCatalogContext({ requestCountApplied: true });
    const firestore = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertSucceeds(
      updateDoc(
        doc(firestore, "printRequestItems", ITEM_ID),
        sizePatch({ standardSizePresetKey: "full_front.adult.m" }),
      ),
    );
  });

  it("denies invalid standardSizePresetKey type during size update", async () => {
    await seedEditableCatalogContext({ requestCountApplied: true });
    const firestore = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertFails(
      updateDoc(
        doc(firestore, "printRequestItems", ITEM_ID),
        sizePatch({ standardSizePresetKey: 123 }),
      ),
    );
  });
});
