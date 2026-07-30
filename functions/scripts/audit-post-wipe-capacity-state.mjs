/**
 * Read-only, developer-controlled audit of capacity-affecting Firestore state, intended to run
 * immediately after the Print Request operational test-data wipe (Plan Section 23, Amendment 5).
 * Reports counts only — never prints customer names/emails or raw document contents.
 *
 * Scope is intentionally narrow: only collections/fields this goal's show-capacity flow actually
 * consults (`queuePortalPrintRequestToShow`, `listPortalAllocatableShows`, the Portal Add-to-Show
 * modal). This is NOT the broader queued `studio-test-data-print-limit-wipe-audit` goal — it exists
 * only to prove or disprove whether wipe residue, not client/callable logic, explains a reported
 * capacity defect.
 *
 * Usage (from repo root, with GOOGLE_APPLICATION_CREDENTIALS or `firebase login:application-default`):
 *   node functions/scripts/audit-post-wipe-capacity-state.mjs
 */
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'fresh-prints-dev';

async function countCollection(db, collectionName) {
  const snapshot = await db.collection(collectionName).count().get();
  return snapshot.data().count;
}

async function countShowsWithResidualCapacityState(db) {
  const snapshot = await db.collection('upcomingShows').get();
  let withAllocatedQuantity = 0;
  let withAccumulatedPrintMs = 0;
  let withActivePrintStartedAt = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (typeof data.allocatedQuantity === 'number' && data.allocatedQuantity > 0) {
      withAllocatedQuantity += 1;
    }
    if (typeof data.accumulatedPrintMs === 'number' && data.accumulatedPrintMs > 0) {
      withAccumulatedPrintMs += 1;
    }
    if (data.activePrintStartedAt !== undefined) {
      withActivePrintStartedAt += 1;
    }
  }
  return { withAllocatedQuantity, withAccumulatedPrintMs, withActivePrintStartedAt, total: snapshot.size };
}

async function countCustomersWithResidualSequenceState(db) {
  const snapshot = await db.collection('customers').get();
  let residual = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (
      (typeof data.nextPrintRequestSequence === 'number' && data.nextPrintRequestSequence !== 1) ||
      (typeof data.totalPrintRequests === 'number' && data.totalPrintRequests !== 0)
    ) {
      residual += 1;
    }
  }
  return residual;
}

async function main() {
  let app;
  try {
    app = getApps().length > 0 ? getApps()[0] : initializeApp({ projectId: PROJECT_ID });
  } catch (error) {
    console.error('Unable to initialize Firebase Admin app:', error.message);
    process.exitCode = 2;
    return;
  }

  const db = getFirestore(app);

  let printRequests;
  let printRequestItems;
  let showAllocations;
  let showResidue;
  let customerSequenceResidue;
  let internalCounterExists;

  try {
    printRequests = await countCollection(db, 'printRequests');
    printRequestItems = await countCollection(db, 'printRequestItems');
    showAllocations = await countCollection(db, 'showAllocations');
    showResidue = await countShowsWithResidualCapacityState(db);
    customerSequenceResidue = await countCustomersWithResidualSequenceState(db);
    const counterSnap = await db.collection('counters').doc('printRequests').get();
    internalCounterExists = counterSnap.exists;
  } catch (error) {
    console.error('Unable to read Firestore for the post-wipe audit:', error.message);
    process.exitCode = 2;
    return;
  }

  console.log(`Remaining operational print requests: ${printRequests}`);
  console.log(`Remaining print request items: ${printRequestItems}`);
  console.log(`Remaining show allocations: ${showAllocations}`);
  console.log(
    `Remaining capacity-affecting counters/docs: ` +
      `${showResidue.withAllocatedQuantity} show(s) with allocatedQuantity > 0, ` +
      `${showResidue.withAccumulatedPrintMs} show(s) with accumulatedPrintMs > 0, ` +
      `${showResidue.withActivePrintStartedAt} show(s) with activePrintStartedAt set, ` +
      `${customerSequenceResidue} customer doc(s) with non-reset sequence/count fields, ` +
      `internal printRequests counter doc exists: ${internalCounterExists}`,
  );
  console.log('Client request cache cleared: [NEEDS MANUAL CONFIRMATION — in-memory only, clears on page reload]');
  console.log('Studio Show Queue cache cleared: [NEEDS MANUAL CONFIRMATION — live onSnapshot, reflects current Firestore state on next emission]');
  console.log('Portal working-request cache cleared: [NEEDS MANUAL CONFIRMATION — live onSnapshot/context state, reflects current Firestore state on next emission]');

  const hasResidue =
    printRequests > 0 ||
    printRequestItems > 0 ||
    showAllocations > 0 ||
    showResidue.withAllocatedQuantity > 0 ||
    showResidue.withAccumulatedPrintMs > 0 ||
    showResidue.withActivePrintStartedAt > 0 ||
    customerSequenceResidue > 0 ||
    internalCounterExists;

  process.exitCode = hasResidue ? 1 : 0;
}

main().catch((error) => {
  console.error('Unexpected failure during post-wipe audit:', error);
  process.exitCode = 2;
});
