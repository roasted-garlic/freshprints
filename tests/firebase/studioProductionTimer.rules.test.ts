/**
 * Reproduces the exact batch write `upcomingShowService.startShowPrinting` performs, against the
 * real checked-in `firestore.rules`, to identify precisely which write/field/condition rejects with
 * `permission-denied` (Plan Section 23, Amendment 5) — the owner's live diagnostic already confirmed
 * this is a genuine Firestore rejection, not a client bug; five independent static re-derivations of
 * the allowlists found no discrepancy, so this test exists to prove (or disprove) the standing
 * diagnosis mechanically against the ACTUAL rules engine, not another manual reading of the file.
 *
 * If this test ALSO passes (owner allowed, batch succeeds), that is strong evidence the checked-in
 * Rules are not the cause — the remaining explanation is deployed-Rules drift from checked-in Rules
 * (see `functions/scripts/compare-deployed-firestore-rules.mjs`) or a live document carrying a field
 * outside the current allowlist. If this test FAILS (unexpectedly denies), it proves a genuine local
 * Rules defect the prior five static reads missed.
 */
import { after, before, beforeEach, describe, it } from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteField, doc, setDoc, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';

let environment: RulesTestEnvironment;

const OWNER_UID = 'owner-uid';
const ADMIN_UID = 'admin-uid';
const HELPER_UID = 'helper-uid';
const CUSTOMER_UID = 'customer-uid';
const INACTIVE_STAFF_UID = 'inactive-staff-uid';

const SHOW_ID = 'show-1';
const ALLOCATION_ID = 'allocation-1';
const SECOND_ALLOCATION_ID = 'allocation-2';

async function seedActiveShowFixture(
  context: Parameters<Parameters<RulesTestEnvironment['withSecurityRulesDisabled']>[0]>[0],
) {
  const firestore = context.firestore();
  await setDoc(doc(firestore, 'users', OWNER_UID), { role: 'owner', isActive: true });
  await setDoc(doc(firestore, 'users', ADMIN_UID), { role: 'admin', isActive: true });
  await setDoc(doc(firestore, 'users', HELPER_UID), { role: 'helper', isActive: true });
  await setDoc(doc(firestore, 'users', CUSTOMER_UID), { role: 'customer', isActive: true });
  await setDoc(doc(firestore, 'users', INACTIVE_STAFF_UID), { role: 'owner', isActive: false });

  // Minimal but complete upcomingShows document, matching upcomingShowRequiredFieldsValid's
  // required fields exactly as startShowPrinting's read-then-batch-update flow expects.
  await setDoc(doc(firestore, 'upcomingShows', SHOW_ID), {
    source: 'whatnot',
    whatnotShowId: 'whatnot-1',
    status: 'scheduled',
    syncStatus: 'idle',
    isArchived: false,
    productionStatus: 'open',
    maxQuantityOverridden: false,
    allocatedQuantity: 5,
    createdBy: OWNER_UID,
    updatedBy: OWNER_UID,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  await setDoc(doc(firestore, 'showAllocations', ALLOCATION_ID), {
    upcomingShowId: SHOW_ID,
    printRequestId: 'request-1',
    printRequestItemId: 'item-1',
    designId: 'design-1',
    customerId: 'customer-1',
    requestNameSnapshot: 'Test request',
    requestOriginSnapshot: 'portal_customer',
    allocatedQuantity: 5,
    sourceItemQuantitySnapshot: 5,
    status: 'pending',
    addedBy: OWNER_UID,
    updatedBy: OWNER_UID,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  await setDoc(doc(firestore, 'showAllocations', SECOND_ALLOCATION_ID), {
    upcomingShowId: SHOW_ID,
    printRequestId: 'request-2',
    printRequestItemId: 'item-2',
    designId: 'design-2',
    customerId: 'customer-1',
    requestNameSnapshot: 'Second test request',
    requestOriginSnapshot: 'portal_customer',
    allocatedQuantity: 3,
    sourceItemQuantitySnapshot: 3,
    status: 'queued',
    addedBy: OWNER_UID,
    updatedBy: OWNER_UID,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

/** Mirrors upcomingShowService.startShowPrinting's exact batch write shape. */
async function runStartPrintingBatch(
  firestore: ReturnType<RulesTestEnvironment['authenticatedContext']>['firestore'] extends (
    ...args: never[]
  ) => infer R
    ? R
    : never,
  callerUid: string,
) {
  const batch = writeBatch(firestore);
  batch.update(doc(firestore, 'upcomingShows', SHOW_ID), {
    productionStatus: 'printing',
    activePrintStartedAt: Timestamp.now(),
    printStartedAt: Timestamp.now(),
    printPausedAt: deleteField(),
    updatedBy: callerUid,
    updatedAt: Timestamp.now(),
  });
  batch.update(doc(firestore, 'showAllocations', ALLOCATION_ID), {
    status: 'in_progress',
    updatedBy: callerUid,
    updatedAt: Timestamp.now(),
  });
  batch.update(doc(firestore, 'showAllocations', SECOND_ALLOCATION_ID), {
    status: 'in_progress',
    updatedBy: callerUid,
    updatedAt: Timestamp.now(),
  });
  return batch.commit();
}

async function runShowTimerUpdate(
  firestore: Parameters<typeof writeBatch>[0],
  callerUid: string,
  productionStatus: string = 'printing',
) {
  const batch = writeBatch(firestore);
  batch.update(doc(firestore, 'upcomingShows', SHOW_ID), {
    productionStatus,
    activePrintStartedAt: Timestamp.now(),
    printStartedAt: Timestamp.now(),
    printPausedAt: deleteField(),
    updatedBy: callerUid,
    updatedAt: Timestamp.now(),
  });
  return batch.commit();
}

async function runAllocationTimerUpdate(
  firestore: Parameters<typeof writeBatch>[0],
  callerUid: string,
) {
  const batch = writeBatch(firestore);
  batch.update(doc(firestore, 'showAllocations', ALLOCATION_ID), {
    status: 'in_progress',
    updatedBy: callerUid,
    updatedAt: Timestamp.now(),
  });
  return batch.commit();
}

async function runFinishPrintingBatch(
  firestore: Parameters<typeof writeBatch>[0],
  callerUid: string,
) {
  const batch = writeBatch(firestore);
  batch.update(doc(firestore, 'upcomingShows', SHOW_ID), {
    productionStatus: 'completed',
    accumulatedPrintMs: 12_000,
    activePrintStartedAt: deleteField(),
    printPausedAt: deleteField(),
    printFinishedAt: Timestamp.now(),
    printFinishedBy: callerUid,
    updatedBy: callerUid,
    updatedAt: Timestamp.now(),
  });
  for (const allocationId of [ALLOCATION_ID, SECOND_ALLOCATION_ID]) {
    batch.update(doc(firestore, 'showAllocations', allocationId), {
      status: 'done',
      completedAt: Timestamp.now(),
      completedBy: callerUid,
      updatedBy: callerUid,
      updatedAt: Timestamp.now(),
    });
  }
  return batch.commit();
}

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-fresh-prints-timer-rules',
    firestore: { host: '127.0.0.1', port: 8080, rules: undefined },
  });
  await environment.withSecurityRulesDisabled(seedActiveShowFixture);
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(seedActiveShowFixture);
});

after(async () => {
  await environment.cleanup();
});

describe('Studio production timer — startShowPrinting batch write against checked-in firestore.rules', () => {
  it('an active owner can start printing (both documents in the batch)', async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(runStartPrintingBatch(firestore, OWNER_UID));
  });

  it('an active admin can start printing', async () => {
    const firestore = environment.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(runStartPrintingBatch(firestore, ADMIN_UID));
  });

  it('an active helper can start printing (current policy: helper is staff)', async () => {
    const firestore = environment.authenticatedContext(HELPER_UID).firestore();
    await assertSucceeds(runStartPrintingBatch(firestore, HELPER_UID));
  });

  it('allows the production-shaped show timer update in isolation', async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(runShowTimerUpdate(firestore, OWNER_UID));
  });

  it('allows the production-shaped allocation update in isolation', async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(runAllocationTimerUpdate(firestore, OWNER_UID));
  });

  it('denies an invalid proposed production status', async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertFails(runShowTimerUpdate(firestore, OWNER_UID, 'not-a-production-status'));
  });

  it('denies an invalid timer transition from open directly to completed', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'upcomingShows', SHOW_ID),
        { legacyImportMarker: true },
        { merge: true },
      );
    });
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertFails(runShowTimerUpdate(firestore, OWNER_UID, 'completed'));
  });

  it('a customer is denied', async () => {
    const firestore = environment.authenticatedContext(CUSTOMER_UID).firestore();
    await assertFails(runStartPrintingBatch(firestore, CUSTOMER_UID));
  });

  it('an inactive staff user is denied', async () => {
    const firestore = environment.authenticatedContext(INACTIVE_STAFF_UID).firestore();
    await assertFails(runStartPrintingBatch(firestore, INACTIVE_STAFF_UID));
  });

  it('an unrelated field change to the show document is denied (allowlist boundary check)', async () => {
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    const batch = writeBatch(firestore);
    batch.update(doc(firestore, 'upcomingShows', SHOW_ID), {
      productionStatus: 'printing',
      activePrintStartedAt: Timestamp.now(),
      printStartedAt: Timestamp.now(),
      updatedBy: OWNER_UID,
      updatedAt: Timestamp.now(),
      notAllowlistedField: 'should be rejected',
    });
    await assertFails(batch.commit());
  });

  it('allows the exact timer batch when a pre-existing legacy show field is preserved', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'upcomingShows', SHOW_ID),
        { legacyImportMarker: true },
        { merge: true },
      );
    });
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(runStartPrintingBatch(firestore, OWNER_UID));
  });

  it('allows the exact three-operation timer batch when a parsed allocation preserves a legacy field', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'showAllocations', SECOND_ALLOCATION_ID),
        { legacyProductionMarker: true },
        { merge: true },
      );
    });
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(runStartPrintingBatch(firestore, OWNER_UID));
  });

  it('denies adding an unrelated field during a legacy allocation timer update', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'showAllocations', SECOND_ALLOCATION_ID),
        { legacyProductionMarker: true },
        { merge: true },
      );
    });
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    const batch = writeBatch(firestore);
    batch.update(doc(firestore, 'showAllocations', SECOND_ALLOCATION_ID), {
      status: 'in_progress',
      updatedBy: OWNER_UID,
      updatedAt: Timestamp.now(),
      newlyAddedField: true,
    });
    await assertFails(batch.commit());
  });

  it('denies an invalid legacy allocation timer transition', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'showAllocations', SECOND_ALLOCATION_ID),
        { legacyProductionMarker: true },
        { merge: true },
      );
    });
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    const batch = writeBatch(firestore);
    batch.update(doc(firestore, 'showAllocations', SECOND_ALLOCATION_ID), {
      status: 'printed',
      updatedBy: OWNER_UID,
      updatedAt: Timestamp.now(),
    });
    await assertFails(batch.commit());
  });

  it('denies changing a preserved legacy allocation field during the timer update', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'showAllocations', SECOND_ALLOCATION_ID), {
        legacyProductionMarker: true,
      }, { merge: true });
    });
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    const batch = writeBatch(firestore);
    batch.update(doc(firestore, 'showAllocations', SECOND_ALLOCATION_ID), {
      status: 'in_progress',
      updatedBy: OWNER_UID,
      updatedAt: Timestamp.now(),
      legacyProductionMarker: false,
    });
    await assertFails(batch.commit());
  });

  it('denies removing a preserved legacy allocation field during the timer update', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'showAllocations', SECOND_ALLOCATION_ID), {
        legacyProductionMarker: true,
      }, { merge: true });
    });
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    const batch = writeBatch(firestore);
    batch.update(doc(firestore, 'showAllocations', SECOND_ALLOCATION_ID), {
      status: 'in_progress',
      updatedBy: OWNER_UID,
      updatedAt: Timestamp.now(),
      legacyProductionMarker: deleteField(),
    });
    await assertFails(batch.commit());
  });
});

describe('Studio production timer — markShowPrintingFinished batch', () => {
  beforeEach(async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      await setDoc(doc(firestore, 'upcomingShows', SHOW_ID), {
        productionStatus: 'printing',
        accumulatedPrintMs: 2_000,
        activePrintStartedAt: Timestamp.now(),
        legacyImportMarker: true,
      }, { merge: true });
      await setDoc(doc(firestore, 'showAllocations', ALLOCATION_ID), {
        status: 'in_progress',
      }, { merge: true });
      await setDoc(doc(firestore, 'showAllocations', SECOND_ALLOCATION_ID), {
        status: 'in_progress',
        legacyProductionMarker: true,
      }, { merge: true });
    });
  });

  it('allows an active owner to finish a legacy-compatible show and allocation batch', async () => {
    await assertSucceeds(runFinishPrintingBatch(
      environment.authenticatedContext(OWNER_UID).firestore(),
      OWNER_UID,
    ));
  });

  it('allows active admin and helper finish transitions', async () => {
    for (const uid of [ADMIN_UID, HELPER_UID]) {
      await environment.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'showAllocations', ALLOCATION_ID), {
          status: 'in_progress',
        }, { merge: true });
      });
      const firestore = environment.authenticatedContext(uid).firestore();
      const batch = writeBatch(firestore);
      batch.update(doc(firestore, 'showAllocations', ALLOCATION_ID), {
        status: 'done',
        completedAt: Timestamp.now(),
        completedBy: uid,
        updatedBy: uid,
        updatedAt: Timestamp.now(),
      });
      await assertSucceeds(batch.commit());
    }
  });

  it('denies customers and inactive staff', async () => {
    for (const uid of [CUSTOMER_UID, INACTIVE_STAFF_UID]) {
      const firestore = environment.authenticatedContext(uid).firestore();
      const batch = writeBatch(firestore);
      batch.update(doc(firestore, 'showAllocations', ALLOCATION_ID), {
        status: 'done',
        completedAt: Timestamp.now(),
        completedBy: uid,
        updatedBy: uid,
        updatedAt: Timestamp.now(),
      });
      await assertFails(batch.commit());
    }
  });

  it('denies unrelated, legacy-field, identity, and invalid-transition mutations', async () => {
    const attempts = [
      { newlyAddedField: true },
      { legacyProductionMarker: false },
      { legacyProductionMarker: deleteField() },
      { completedBy: ADMIN_UID },
      { updatedBy: ADMIN_UID },
    ];
    for (const extra of attempts) {
      const firestore = environment.authenticatedContext(OWNER_UID).firestore();
      const batch = writeBatch(firestore);
      batch.update(doc(firestore, 'showAllocations', SECOND_ALLOCATION_ID), {
        status: 'done',
        completedAt: Timestamp.now(),
        completedBy: OWNER_UID,
        updatedBy: OWNER_UID,
        updatedAt: Timestamp.now(),
        ...extra,
      });
      await assertFails(batch.commit());
    }

    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    const invalid = writeBatch(firestore);
    invalid.update(doc(firestore, 'showAllocations', SECOND_ALLOCATION_ID), {
      status: 'printed',
      completedAt: Timestamp.now(),
      completedBy: OWNER_UID,
      updatedBy: OWNER_UID,
      updatedAt: Timestamp.now(),
    });
    await assertFails(invalid.commit());
  });

  it('denies finish from a non-finishable source status', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'showAllocations', SECOND_ALLOCATION_ID), {
        status: 'canceled',
      }, { merge: true });
    });
    const firestore = environment.authenticatedContext(OWNER_UID).firestore();
    await assertFails(updateDoc(doc(firestore, 'showAllocations', SECOND_ALLOCATION_ID), {
      status: 'done',
      completedAt: Timestamp.now(),
      completedBy: OWNER_UID,
      updatedBy: OWNER_UID,
      updatedAt: Timestamp.now(),
    }));
  });

  it('denies missing or non-timestamp completion audit fields', async () => {
    const invalidPayloads = [
      {
        status: 'done',
        completedBy: OWNER_UID,
        updatedBy: OWNER_UID,
        updatedAt: Timestamp.now(),
      },
      {
        status: 'done',
        completedAt: 'not-a-timestamp',
        completedBy: OWNER_UID,
        updatedBy: OWNER_UID,
        updatedAt: Timestamp.now(),
      },
      {
        status: 'done',
        completedAt: Timestamp.now(),
        completedBy: OWNER_UID,
        updatedBy: OWNER_UID,
        updatedAt: deleteField(),
      },
      {
        status: 'done',
        completedAt: Timestamp.now(),
        completedBy: OWNER_UID,
        updatedBy: OWNER_UID,
        updatedAt: 'not-a-timestamp',
      },
    ];
    for (const payload of invalidPayloads) {
      const firestore = environment.authenticatedContext(OWNER_UID).firestore();
      await assertFails(updateDoc(
        doc(firestore, 'showAllocations', SECOND_ALLOCATION_ID),
        payload,
      ));
    }
  });
});
