import { after, before, beforeEach, describe, it } from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";

let environment: RulesTestEnvironment;

const OWNER_UID = "owner-maintenance";
const HELPER_UID = "helper-maintenance";
const CUSTOMER_UID = "customer-maintenance";
const CUSTOMER_ID = "customer-maintenance";
const TESTER_UID = "tester-maintenance";
const TESTER_ID = "tester-maintenance";
const OTHER_CUSTOMER_UID = "other-customer-maintenance";
const OTHER_CUSTOMER_ID = "other-customer-maintenance";
const REQUEST_ID = "request-maintenance";
const ITEM_ID = "item-maintenance";
const DESIGN_ID = "design-maintenance";
const NOTIFICATION_ID = "notification-maintenance";

async function seedState(enabled: unknown = undefined, maintenanceTestCustomerUid?: string | null): Promise<void> {
  await environment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    const now = Timestamp.now();
    await setDoc(doc(firestore, "users", OWNER_UID), { role: "owner", isActive: true });
    await setDoc(doc(firestore, "users", HELPER_UID), { role: "helper", isActive: true });
    await setDoc(doc(firestore, "users", CUSTOMER_UID), { role: "customer", isActive: true });
    await setDoc(doc(firestore, "users", TESTER_UID), { role: "customer", isActive: true });
    await setDoc(doc(firestore, "users", OTHER_CUSTOMER_UID), { role: "customer", isActive: true });
    await setDoc(doc(firestore, "customers", CUSTOMER_ID), {
      id: CUSTOMER_ID,
      userId: CUSTOMER_UID,
      displayName: "Maintenance Customer",
      username: "maintenancecustomer",
      isGuest: false,
      totalPrintRequests: 0,
      nextPrintRequestSequence: 1,
      createdAt: now,
      updatedAt: now,
    });
    for (const [customerId, userId, displayName] of [
      [TESTER_ID, TESTER_UID, "Maintenance Tester"],
      [OTHER_CUSTOMER_ID, OTHER_CUSTOMER_UID, "Other Customer"],
    ] as const) {
      await setDoc(doc(firestore, "customers", customerId), {
        id: customerId,
        userId,
        displayName,
        username: customerId,
        isGuest: false,
        totalPrintRequests: 0,
        nextPrintRequestSequence: 1,
        createdAt: now,
        updatedAt: now,
      });
    }
    await setDoc(doc(firestore, "designs", DESIGN_ID), {
      id: DESIGN_ID,
      title: "Maintenance design",
      tags: [],
      status: "ready",
      originalPath: `${DESIGN_ID}.png`,
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(firestore, "printRequests", REQUEST_ID), {
      id: REQUEST_ID,
      name: "Maintenance request",
      customerId: CUSTOMER_ID,
      requestOrigin: "portal_customer",
      isInternal: false,
      status: "draft",
      itemCount: 1,
      createdBy: CUSTOMER_UID,
      updatedBy: CUSTOMER_UID,
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(firestore, "printRequestItems", ITEM_ID), {
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
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(firestore, "customerNotifications", NOTIFICATION_ID), {
      id: NOTIFICATION_ID,
      customerId: CUSTOMER_ID,
      customerUid: CUSTOMER_UID,
      kind: "print_request_status",
      title: "Request update",
      body: "A request changed.",
      href: "/requests",
      requestId: REQUEST_ID,
      createdAt: now,
      updatedAt: now,
    });
    if (enabled !== undefined) {
      await setDoc(doc(firestore, "settings", "portalMaintenance"), {
        enabled,
        ...(maintenanceTestCustomerUid !== undefined ? { maintenanceTestCustomerUid } : {}),
      });
    }
  });
}

before(async () => {
  environment = await initializeTestEnvironment({
    // Storage Rules cross-service lookups use the configured emulator project. Keep this
    // aligned with firebase.json so the seeded users/{uid} documents are visible to Storage.
    projectId: "fresh-prints-dev",
    firestore: { host: "127.0.0.1", port: 8080, rules: undefined },
    storage: { host: "127.0.0.1", port: 9199, rules: undefined },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await seedState();
});

after(async () => {
  await environment.cleanup();
});

describe("Portal maintenance Firestore Rules reinforcement", () => {
  it("keeps representative customer writes working when the state is absent", async () => {
    const firestore = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(firestore, "customers", CUSTOMER_ID, "favorites", DESIGN_ID), {
        designId: DESIGN_ID,
        customerId: CUSTOMER_ID,
        createdBy: CUSTOMER_UID,
        createdAt: Timestamp.now(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(firestore, "customers", CUSTOMER_ID), {
        assistedProofEmailOptIn: true,
        assistedProofEmailOptInUpdatedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(firestore, "printRequests", REQUEST_ID), {
        notes: "normal",
        itemCount: 1,
        updatedBy: CUSTOMER_UID,
        updatedAt: Timestamp.now(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(firestore, "printRequestItems", ITEM_ID), {
        printWidthInches: 5,
        printHeightInches: 5,
        sizeLabel: '5" × 5"',
        updatedAt: Timestamp.now(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(firestore, "customerNotifications", NOTIFICATION_ID), {
        readAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it("denies representative customer writes while enabled, including notification markers", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "settings", "portalMaintenance"), { enabled: true });
    });
    const firestore = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertFails(
      setDoc(doc(firestore, "customers", CUSTOMER_ID, "favorites", DESIGN_ID), {
        designId: DESIGN_ID,
        customerId: CUSTOMER_ID,
        createdBy: CUSTOMER_UID,
        createdAt: Timestamp.now(),
      }),
    );
    await assertFails(
      updateDoc(doc(firestore, "customers", CUSTOMER_ID), {
        assistedProofEmailOptIn: true,
        assistedProofEmailOptInUpdatedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );
    await assertFails(
      updateDoc(doc(firestore, "printRequests", REQUEST_ID), {
        notes: "blocked",
        itemCount: 1,
        updatedBy: CUSTOMER_UID,
        updatedAt: Timestamp.now(),
      }),
    );
    await assertFails(
      updateDoc(doc(firestore, "printRequestItems", ITEM_ID), {
        printWidthInches: 5,
        printHeightInches: 5,
        sizeLabel: '5" × 5"',
        updatedAt: Timestamp.now(),
      }),
    );
    await assertFails(
      updateDoc(doc(firestore, "customerNotifications", NOTIFICATION_ID), {
        readAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
    );

    const guest = environment.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(guest, "customers", CUSTOMER_ID, "favorites", DESIGN_ID), {
        designId: DESIGN_ID,
        customerId: CUSTOMER_ID,
        createdBy: "guest",
        createdAt: Timestamp.now(),
      }),
    );
  });

  it("allows only the configured tester while enabled and keeps another customer blocked", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "settings", "portalMaintenance"), {
        enabled: true,
        maintenanceTestCustomerUid: TESTER_UID,
      });
    });

    const tester = environment.authenticatedContext(TESTER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(tester, "customers", TESTER_ID, "favorites", DESIGN_ID), {
        designId: DESIGN_ID,
        customerId: TESTER_ID,
        createdBy: TESTER_UID,
        createdAt: Timestamp.now(),
      }),
    );

    const other = environment.authenticatedContext(OTHER_CUSTOMER_UID).firestore();
    await assertFails(
      setDoc(doc(other, "customers", OTHER_CUSTOMER_ID, "favorites", DESIGN_ID), {
        designId: DESIGN_ID,
        customerId: OTHER_CUSTOMER_ID,
        createdBy: OTHER_CUSTOMER_UID,
        createdAt: Timestamp.now(),
      }),
    );
  });

  it("keeps OFF behavior unchanged when a tester is configured and removes the bypass when cleared", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "settings", "portalMaintenance"), {
        enabled: false,
        maintenanceTestCustomerUid: TESTER_UID,
      });
    });
    const customer = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(customer, "customers", CUSTOMER_ID, "favorites", DESIGN_ID), {
        designId: DESIGN_ID,
        customerId: CUSTOMER_ID,
        createdBy: CUSTOMER_UID,
        createdAt: Timestamp.now(),
      }),
    );

    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "settings", "portalMaintenance"), {
        enabled: true,
        maintenanceTestCustomerUid: null,
      });
    });
    const tester = environment.authenticatedContext(TESTER_UID).firestore();
    await assertFails(
      setDoc(doc(tester, "customers", TESTER_ID, "favorites", DESIGN_ID), {
        designId: DESIGN_ID,
        customerId: TESTER_ID,
        createdBy: TESTER_UID,
        createdAt: Timestamp.now(),
      }),
    );
  });

  it("fails closed when a present maintenance state is malformed", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "settings", "portalMaintenance"), { enabled: "true" });
    });
    const firestore = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertFails(
      setDoc(doc(firestore, "customers", CUSTOMER_ID, "favorites", DESIGN_ID), {
        designId: DESIGN_ID,
        customerId: CUSTOMER_ID,
        createdBy: CUSTOMER_UID,
        createdAt: Timestamp.now(),
      }),
    );
  });

  it("preserves owner/admin access to the private state without public reads", async () => {
    await seedState(false);
    const owner = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(getDoc(doc(owner, "settings", "portalMaintenance")));
    const customer = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertFails(getDoc(doc(customer, "settings", "portalMaintenance")));
    await assertFails(
      setDoc(doc(customer, "settings", "portalMaintenance"), { enabled: true }),
    );
    const helper = environment.authenticatedContext(HELPER_UID).firestore();
    await assertFails(
      setDoc(doc(helper, "settings", "portalMaintenance"), { enabled: true }),
    );
    await assertFails(
      setDoc(doc(owner, "settings", "portalMaintenance"), { enabled: true }),
    );
  });
});

describe("Portal maintenance Storage Rules reinforcement", () => {
  it("allows customer source upload when state is absent and denies it when enabled", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const storage = environment.authenticatedContext(CUSTOMER_UID).storage();
    await assertSucceeds(
      uploadBytes(ref(storage, `customer-uploads/${CUSTOMER_UID}/upload-off/source`), bytes, {
        contentType: "image/png",
      }),
    );

    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "settings", "portalMaintenance"), { enabled: true });
    });

    await assertFails(
      uploadBytes(ref(storage, `customer-uploads/${CUSTOMER_UID}/upload-on/source`), bytes, {
        contentType: "image/png",
      }),
    );
  });

  it("allows tester source and Assisted Creation pending writes while enabled, but denies ordinary customers", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "settings", "portalMaintenance"), {
        enabled: true,
        maintenanceTestCustomerUid: TESTER_UID,
      });
    });

    const tester = environment.authenticatedContext(TESTER_UID).storage();
    await assertSucceeds(
      uploadBytes(ref(tester, `customer-uploads/${TESTER_UID}/upload/source`), bytes, {
        contentType: "image/png",
      }),
    );
    await assertSucceeds(
      uploadBytes(ref(tester, `assisted-creation/${TESTER_UID}/pending/image`), bytes, {
        contentType: "image/png",
      }),
    );

    const ordinary = environment.authenticatedContext(CUSTOMER_UID).storage();
    await assertFails(
      uploadBytes(ref(ordinary, `customer-uploads/${CUSTOMER_UID}/upload/source`), bytes, {
        contentType: "image/png",
      }),
    );
    await assertFails(
      uploadBytes(ref(ordinary, `assisted-creation/${CUSTOMER_UID}/pending/image`), bytes, {
        contentType: "image/png",
      }),
    );
  });
});
