import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import { adminDb } from "./admin";
import {
  assertPortalMaintenanceAllowsCustomerMutation,
  listActiveLinkedMaintenanceTestCustomers,
  loadPortalMaintenanceState,
  savePortalMaintenanceState,
} from "./portalMaintenance";

const OWNER_UID = "maintenance-validation-owner";
const TARGET_UID = "maintenance-validation-target";
const TARGET_CUSTOMER_ID = "maintenance-validation-customer";

async function clearFixtures(): Promise<void> {
  await Promise.all([
    adminDb.collection("users").doc(OWNER_UID).delete(),
    adminDb.collection("users").doc(TARGET_UID).delete(),
    adminDb.collection("customers").doc(TARGET_CUSTOMER_ID).delete(),
    adminDb.collection("settings").doc("portalMaintenance").delete(),
  ]);
}

async function seedTarget(options: {
  isActive?: boolean;
  isDeleted?: boolean;
  isDisabled?: boolean;
  isGuest?: boolean;
  isMerged?: boolean;
} = {}): Promise<void> {
  await adminDb.collection("users").doc(OWNER_UID).set({ role: "owner", isActive: true });
  await adminDb.collection("users").doc(TARGET_UID).set({
    role: "customer",
    isActive: options.isActive ?? true,
    isDeleted: options.isDeleted ?? false,
  });
  await adminDb.collection("customers").doc(TARGET_CUSTOMER_ID).set({
    userId: TARGET_UID,
    isDeleted: options.isDeleted ?? false,
    isDisabled: options.isDisabled ?? false,
    isGuest: options.isGuest ?? false,
    isMerged: options.isMerged ?? false,
    ...(options.isMerged ? { mergedIntoCustomerId: "maintenance-survivor" } : {}),
    displayName: "Maintenance Target",
    username: "maintenance-target",
  });
}

function assertInvalidTarget(): Promise<unknown> {
  return assert.rejects(
    () =>
      savePortalMaintenanceState(
        { enabled: true, maintenanceTestCustomerUid: TARGET_UID },
        OWNER_UID,
      ),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      (error as { code?: unknown }).code === "invalid-argument",
  );
}

describe("portal maintenance tester validation", () => {
  before(() => {
    assert.ok(
      process.env.FIRESTORE_EMULATOR_HOST,
      "run this integration test with the Firestore emulator",
    );
  });

  beforeEach(clearFixtures);
  after(clearFixtures);

  it("rejects an unlinked, inactive, deleted, or disabled target", async () => {
    await assertInvalidTarget();

    await seedTarget({ isActive: false });
    await assertInvalidTarget();

    await seedTarget({ isDeleted: true });
    await assertInvalidTarget();

    await seedTarget({ isDisabled: true });
    await assertInvalidTarget();

    await seedTarget({ isGuest: true });
    await assertInvalidTarget();

    await seedTarget({ isMerged: true });
    await assertInvalidTarget();
  });

  it("accepts one active linked customer and clears the bypass immediately", async () => {
    await seedTarget();
    await savePortalMaintenanceState(
      {
        enabled: true,
        heading: "We are back soon!",
        message: "A short maintenance break.",
        maintenanceTestCustomerUid: TARGET_UID,
      },
      OWNER_UID,
    );
    const saved = await loadPortalMaintenanceState();
    assert.equal(saved.enabled, true);
    assert.equal(saved.heading, "We are back soon!");
    assert.equal(saved.message, "A short maintenance break.");
    assert.equal(saved.maintenanceTestCustomerUid, TARGET_UID);
    assert.equal(saved.updatedBy, OWNER_UID);

    await savePortalMaintenanceState(
      { enabled: true, maintenanceTestCustomerUid: null },
      OWNER_UID,
    );
    assert.equal((await loadPortalMaintenanceState()).maintenanceTestCustomerUid, undefined);
  });

  it("lists only active linked, non-merged customer accounts", async () => {
    await seedTarget();
    const eligible = await listActiveLinkedMaintenanceTestCustomers();
    assert.deepEqual(eligible, [
      {
        uid: TARGET_UID,
        displayName: "Maintenance Target",
        username: "maintenance-target",
      },
    ]);

    await seedTarget({ isMerged: true });
    assert.deepEqual(await listActiveLinkedMaintenanceTestCustomers(), []);
  });

  it("removes tester bypass when the configured account becomes merged", async () => {
    await seedTarget();
    await savePortalMaintenanceState(
      { enabled: true, maintenanceTestCustomerUid: TARGET_UID },
      OWNER_UID,
    );
    await assertPortalMaintenanceAllowsCustomerMutation(TARGET_UID);

    await adminDb.collection("customers").doc(TARGET_CUSTOMER_ID).update({
      isMerged: true,
      mergedIntoCustomerId: "maintenance-survivor",
    });

    await assert.rejects(() => assertPortalMaintenanceAllowsCustomerMutation(TARGET_UID));
  });
});
