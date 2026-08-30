/**
 * Reproduces the sequential client writes `upcomingShowService.allocatePrintRequestItem`
 * performs against checked-in `firestore.rules`.
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
import {
  collection,
  doc,
  setDoc,
  Timestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore";

let environment: RulesTestEnvironment;

const OWNER_UID = "owner-uid";
const ADMIN_UID = "admin-uid";
const HELPER_UID = "helper-uid";
const CUSTOMER_UID = "customer-uid";

const WHATNOT_SHOW_ID = "show-whatnot";
const MANUAL_SHOW_ID = "show-manual";
const DEV_FIXTURE_SHOW_ID = "show-dev-fixture";
const CUSTOMER_REQUEST_ID = "request-customer";
const INTERNAL_REQUEST_ID = "request-internal";
const ALLOCATION_ID = "allocation-existing";

function buildWhatnotShowDoc(overrides: Record<string, unknown> = {}) {
  return {
    source: "whatnot",
    whatnotShowId: "whatnot-uuid-1",
    status: "scheduled",
    syncStatus: "idle",
    isArchived: false,
    productionStatus: "open",
    maxQuantityOverridden: false,
    allocatedQuantity: 0,
    accumulatedPrintMs: 0,
    createdBy: OWNER_UID,
    updatedBy: OWNER_UID,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

function buildDevFixtureShowDoc(overrides: Record<string, unknown> = {}) {
  return {
    source: "dev_fixture",
    devFixtureSentinel: "DEV-OVERRIDE",
    title: "DEV fixture show",
    status: "scheduled",
    syncStatus: "idle",
    isArchived: false,
    productionStatus: "open",
    maxQuantityOverridden: false,
    allocatedQuantity: 0,
    accumulatedPrintMs: 0,
    createdBy: OWNER_UID,
    updatedBy: OWNER_UID,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

function buildPrintRequestDoc(overrides: Record<string, unknown> = {}) {
  return {
    name: "customer-CR001",
    customerId: "customer-1",
    isInternal: false,
    requestOrigin: "portal_customer",
    status: "editing",
    itemCount: 1,
    customerUsernameSnapshot: "fresh_prints",
    customerDisplayNameSnapshot: "Fresh Prints",
    customerUsernameAtCreationSnapshot: "fresh_prints",
    customerDisplayNameAtCreationSnapshot: "Fresh Prints",
    createdBy: OWNER_UID,
    updatedBy: OWNER_UID,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

function buildAllocationPayload(showId: string, requestId: string, callerUid: string) {
  return {
    upcomingShowId: showId,
    printRequestId: requestId,
    printRequestItemId: "item-1",
    designId: "design-1",
    sourceType: "catalog_design",
    customerId: "customer-1",
    requestNameSnapshot: "customer-CR001",
    requestOriginSnapshot: "portal_customer",
    allocatedQuantity: 2,
    sourceItemQuantitySnapshot: 2,
    status: "pending",
    addedBy: callerUid,
    updatedBy: callerUid,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

async function runAllocatePrintRequestItemSequence(
  firestore: Firestore,
  callerUid: string,
  showId: string,
  requestId: string,
  allocationId: string,
) {
  await setDoc(
    doc(firestore, "showAllocations", allocationId),
    buildAllocationPayload(showId, requestId, callerUid),
  );
  await updateDoc(doc(firestore, "upcomingShows", showId), {
    allocatedQuantity: 2,
    updatedBy: callerUid,
    updatedAt: Timestamp.now(),
  });
  await updateDoc(doc(firestore, "printRequests", requestId), {
    status: "active",
    updatedBy: callerUid,
    updatedAt: Timestamp.now(),
  });
}

async function seedBaseFixture(context: Parameters<Parameters<RulesTestEnvironment["withSecurityRulesDisabled"]>[0]>[0]) {
  const firestore = context.firestore();
  await setDoc(doc(firestore, "users", OWNER_UID), { role: "owner", isActive: true });
  await setDoc(doc(firestore, "users", ADMIN_UID), { role: "admin", isActive: true });
  await setDoc(doc(firestore, "users", HELPER_UID), { role: "helper", isActive: true });
  await setDoc(doc(firestore, "users", CUSTOMER_UID), { role: "customer", isActive: true });

  await setDoc(
    doc(firestore, "upcomingShows", WHATNOT_SHOW_ID),
    buildWhatnotShowDoc({
      productionResolutionKind: "unfulfilled_release",
      productionResolvedAt: Timestamp.now(),
      productionResolvedBy: OWNER_UID,
      productionOverrideReason: "Missed show",
    }),
  );

  await setDoc(
    doc(firestore, "upcomingShows", MANUAL_SHOW_ID),
    buildWhatnotShowDoc({
      whatnotShowId: "manual-show-id",
      title: "Manual show",
    }),
  );

  await setDoc(doc(firestore, "upcomingShows", DEV_FIXTURE_SHOW_ID), buildDevFixtureShowDoc());

  await setDoc(doc(firestore, "printRequests", CUSTOMER_REQUEST_ID), buildPrintRequestDoc());
  await setDoc(
    doc(firestore, "printRequests", INTERNAL_REQUEST_ID),
    {
      name: "internal-IR001",
      isInternal: true,
      requestOrigin: "studio_internal",
      status: "editing",
      itemCount: 1,
      createdBy: OWNER_UID,
      updatedBy: OWNER_UID,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
  );
}

describe("Show Queue allocation — allocatePrintRequestItem sequence", () => {
  before(async () => {
    const rules = readFileSync(path.resolve("firestore.rules"), "utf8");
    environment = await initializeTestEnvironment({
      projectId: "fresh-prints-show-queue-allocation-rules",
      firestore: { rules },
    });
  });

  after(async () => {
    await environment.cleanup();
  });

  beforeEach(async () => {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(seedBaseFixture);
  });

  it("allows owner full sequence on Whatnot show with production-resolution metadata", async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      runAllocatePrintRequestItemSequence(
        firestore,
        OWNER_UID,
        WHATNOT_SHOW_ID,
        CUSTOMER_REQUEST_ID,
        "alloc-whatnot-1",
      ),
    );
  });

  it("allows owner full sequence on manual Whatnot-sourced show", async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      runAllocatePrintRequestItemSequence(
        firestore,
        OWNER_UID,
        MANUAL_SHOW_ID,
        CUSTOMER_REQUEST_ID,
        "alloc-manual-1",
      ),
    );
  });

  it("allows helper full sequence on DEV fixture show", async () => {
    const firestore = environment.authenticatedContext(HELPER_UID).firestore();
    await assertSucceeds(
      runAllocatePrintRequestItemSequence(
        firestore,
        HELPER_UID,
        DEV_FIXTURE_SHOW_ID,
        CUSTOMER_REQUEST_ID,
        "alloc-dev-1",
      ),
    );
  });

  it("allows internal print request activation when supported", async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      runAllocatePrintRequestItemSequence(
        firestore,
        OWNER_UID,
        WHATNOT_SHOW_ID,
        INTERNAL_REQUEST_ID,
        "alloc-internal-1",
      ),
    );
  });

  it("keeps print request with creation snapshot fields writable during activation", async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(firestore, "printRequests", CUSTOMER_REQUEST_ID), {
        status: "active",
        updatedBy: OWNER_UID,
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it("denies customer allocation create", async () => {
    const firestore = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertFails(
      setDoc(
        doc(firestore, "showAllocations", "alloc-customer"),
        buildAllocationPayload(WHATNOT_SHOW_ID, CUSTOMER_REQUEST_ID, CUSTOMER_UID),
      ),
    );
  });

  it("denies unauthenticated allocation create", async () => {
    const firestore = environment.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(
        doc(firestore, "showAllocations", "alloc-signed-out"),
        buildAllocationPayload(WHATNOT_SHOW_ID, CUSTOMER_REQUEST_ID, OWNER_UID),
      ),
    );
  });

  it("denies client create of dev_fixture shows", async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(collection(firestore, "upcomingShows")), buildDevFixtureShowDoc({ title: "blocked" })),
    );
  });

  it("denies customer tampering with show productionStatus during allocation capacity update", async () => {
    const firestore = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertFails(
      updateDoc(doc(firestore, "upcomingShows", WHATNOT_SHOW_ID), {
        allocatedQuantity: 2,
        productionStatus: "printing",
        updatedBy: CUSTOMER_UID,
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it("allows authorized removal recalculation write on show with recovery metadata", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "showAllocations", ALLOCATION_ID), {
        ...buildAllocationPayload(WHATNOT_SHOW_ID, CUSTOMER_REQUEST_ID, OWNER_UID),
        allocatedQuantity: 5,
      });
    });

    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(firestore, "upcomingShows", WHATNOT_SHOW_ID), {
        allocatedQuantity: 0,
        updatedBy: OWNER_UID,
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it("allows staff to set needsStaffRequeue fields on print request", async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(firestore, "printRequests", CUSTOMER_REQUEST_ID), {
        needsStaffRequeueAt: Timestamp.now(),
        needsStaffRequeueSourceShowId: WHATNOT_SHOW_ID,
        needsStaffRequeueSourceShowTitleSnapshot: "Missed Live",
        needsStaffRequeueReleasedQuantity: 4,
        updatedBy: OWNER_UID,
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it("allows staff allocation create with requeuedFromAllocationId audit field", async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(firestore, "showAllocations", "alloc-requeue-audit"), {
        ...buildAllocationPayload(WHATNOT_SHOW_ID, CUSTOMER_REQUEST_ID, OWNER_UID),
        requeuedFromAllocationId: "alloc-source-1",
      }),
    );
  });

  it("denies customer tampering with needsStaffRequeue fields", async () => {
    const firestore = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertFails(
      updateDoc(doc(firestore, "printRequests", CUSTOMER_REQUEST_ID), {
        needsStaffRequeueAt: Timestamp.now(),
        needsStaffRequeueSourceShowId: WHATNOT_SHOW_ID,
        needsStaffRequeueReleasedQuantity: 4,
        updatedBy: CUSTOMER_UID,
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it("allows owner metadata-only update on Whatnot show", async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(firestore, "upcomingShows", WHATNOT_SHOW_ID), {
        title: "Renamed show",
        notes: "Updated notes",
        scheduledStartAt: Timestamp.fromDate(new Date("2026-09-15T20:30:00Z")),
        whatnotUrl: "https://www.whatnot.com/live/whatnot-uuid-1",
        updatedBy: OWNER_UID,
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it("allows owner metadata-only update on DEV fixture show", async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(firestore, "upcomingShows", DEV_FIXTURE_SHOW_ID), {
        title: "DEV fixture renamed",
        notes: "Fixture notes",
        scheduledStartAt: Timestamp.fromDate(new Date("2026-09-01T18:00:00Z")),
        updatedBy: OWNER_UID,
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it("denies owner metadata path when Whatnot show ID would change", async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      updateDoc(doc(firestore, "upcomingShows", WHATNOT_SHOW_ID), {
        title: "Renamed show",
        whatnotShowId: "different-show-id",
        updatedBy: OWNER_UID,
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it("documents staff broad update path still governs mixed operational edits", async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(firestore, "upcomingShows", WHATNOT_SHOW_ID), {
        title: "Renamed show",
        productionStatus: "printing",
        updatedBy: OWNER_UID,
        updatedAt: Timestamp.now(),
      }),
    );
  });

  it("denies customer metadata update on show", async () => {
    const firestore = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertFails(
      updateDoc(doc(firestore, "upcomingShows", WHATNOT_SHOW_ID), {
        title: "Customer edit",
        updatedBy: CUSTOMER_UID,
        updatedAt: Timestamp.now(),
      }),
    );
  });
});
