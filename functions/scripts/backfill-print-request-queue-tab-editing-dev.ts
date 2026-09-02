/**
 * DEV-only queueTab backfill runner mirroring `backfillPrintRequestQueueTab` callable logic.
 * Used by agents when Studio console is unavailable; same compute + paging contract.
 *
 *   node --import tsx functions/scripts/backfill-print-request-queue-tab-editing-dev.ts
 *   APPLY=1 node --import tsx functions/scripts/backfill-print-request-queue-tab-editing-dev.ts
 *
 * Refuses non-dev projects unless ALLOW_NON_DEV=1.
 */
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { computePrintRequestQueueTab } from "../../packages/shared/src/utils/printRequestQueueTabRecompute.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FUNCTIONS_ROOT = resolve(__dirname, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));

const { initializeApp, applicationDefault, getApps } = require("firebase-admin/app");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "fresh-prints-dev";
const apply = process.env.APPLY === "1";
const allowNonDev = process.env.ALLOW_NON_DEV === "1";
const PAGE_LIMIT = 400;

if (projectId !== "fresh-prints-dev" && !allowNonDev) {
  console.error(`Refusing project "${projectId}". DEV only.`);
  process.exit(1);
}

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault(), projectId });
}

const db = getFirestore();

function changeKey(from, to) {
  return `${from ?? "<absent>"}→${to ?? "<delete>"}`;
}

async function main() {
  console.log(JSON.stringify({ projectId, dryRun: !apply, pageLimit: PAGE_LIMIT }, null, 2));

  let startAfterRequestId = "";
  let pages = 0;
  let scanned = 0;
  let alreadyCorrect = 0;
  let updated = 0;
  const byCurrent = Object.create(null);
  const byProposed = Object.create(null);
  const byTransition = Object.create(null);
  let editingWorkingToEditing = 0;
  let unrelatedMaterial = 0;
  const unrelatedSamples = [];
  const editingSamples = [];

  for (;;) {
    let query = db.collection("printRequests").orderBy("__name__").limit(PAGE_LIMIT);
    if (startAfterRequestId) {
      const cursorSnap = await db.collection("printRequests").doc(startAfterRequestId).get();
      if (!cursorSnap.exists) {
        throw new Error(`startAfterRequestId missing: ${startAfterRequestId}`);
      }
      query = query.startAfter(cursorSnap);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      break;
    }

    pages += 1;
    const batch = db.batch();
    let batchWrites = 0;

    for (const requestDoc of snapshot.docs) {
      scanned += 1;
      const requestData = requestDoc.data() ?? {};
      const status =
        typeof requestData.status === "string" ? requestData.status : "draft";
      const currentTab =
        typeof requestData.queueTab === "string" ? requestData.queueTab : null;

      byCurrent[currentTab ?? "<absent>"] = (byCurrent[currentTab ?? "<absent>"] ?? 0) + 1;

      const [itemsSnapshot, allocationsSnapshot] = await Promise.all([
        db.collection("printRequestItems").where("printRequestId", "==", requestDoc.id).get(),
        db.collection("showAllocations").where("printRequestId", "==", requestDoc.id).get(),
      ]);

      const nextQueueTab = computePrintRequestQueueTab({
        status,
        items: itemsSnapshot.docs.map((doc) => ({
          quantity: typeof doc.data().quantity === "number" ? doc.data().quantity : 0,
        })),
        allocations: allocationsSnapshot.docs.map((doc) => ({
          allocatedQuantity:
            typeof doc.data().allocatedQuantity === "number" ? doc.data().allocatedQuantity : 0,
          status: typeof doc.data().status === "string" ? doc.data().status : "canceled",
        })),
      });

      byProposed[nextQueueTab ?? "<delete>"] = (byProposed[nextQueueTab ?? "<delete>"] ?? 0) + 1;

      if (nextQueueTab === null) {
        if (requestData.queueTab !== undefined) {
          updated += 1;
          const key = changeKey(currentTab, null);
          byTransition[key] = (byTransition[key] ?? 0) + 1;
          unrelatedMaterial += 1;
          if (unrelatedSamples.length < 20) {
            unrelatedSamples.push({
              id: requestDoc.id,
              status,
              from: currentTab,
              to: null,
              reason: "archived-or-null-tab-clear",
            });
          }
          if (apply) {
            batch.update(requestDoc.ref, {
              queueTab: FieldValue.delete(),
              updatedAt: FieldValue.serverTimestamp(),
            });
            batchWrites += 1;
          }
        } else {
          alreadyCorrect += 1;
        }
        continue;
      }

      if (requestData.queueTab === nextQueueTab) {
        alreadyCorrect += 1;
        continue;
      }

      updated += 1;
      const key = changeKey(currentTab, nextQueueTab);
      byTransition[key] = (byTransition[key] ?? 0) + 1;

      const isEditingRepair =
        status === "editing" && currentTab === "working" && nextQueueTab === "editing";
      if (isEditingRepair) {
        editingWorkingToEditing += 1;
        if (editingSamples.length < 30) {
          editingSamples.push({ id: requestDoc.id, status, from: currentTab, to: nextQueueTab });
        }
      } else {
        unrelatedMaterial += 1;
        if (unrelatedSamples.length < 20) {
          unrelatedSamples.push({
            id: requestDoc.id,
            status,
            from: currentTab,
            to: nextQueueTab,
          });
        }
      }

      if (apply) {
        batch.update(requestDoc.ref, {
          queueTab: nextQueueTab,
          updatedAt: FieldValue.serverTimestamp(),
        });
        batchWrites += 1;
      }
    }

    if (apply && batchWrites > 0) {
      await batch.commit();
    }

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    startAfterRequestId = lastDoc.id;
    console.log(
      JSON.stringify({
        page: pages,
        scannedPage: snapshot.size,
        scannedTotal: scanned,
        updatedTotal: updated,
        lastId: startAfterRequestId,
      }),
    );

    if (snapshot.size < PAGE_LIMIT) {
      break;
    }
  }

  const summary = {
    projectId,
    dryRun: !apply,
    pages,
    scanned,
    alreadyCorrect,
    updated,
    editingWorkingToEditing,
    unrelatedMaterial,
    byCurrentQueueTab: byCurrent,
    byProposedQueueTab: byProposed,
    byTransition,
    editingSamples,
    unrelatedSamples,
  };
  console.log("---SUMMARY---");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
