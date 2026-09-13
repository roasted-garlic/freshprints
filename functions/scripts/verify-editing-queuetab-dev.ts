import { createRequire } from "node:module";

const require = createRequire("c:/coding/fresh-prints/functions/package.json");
const { initializeApp, applicationDefault, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

async function main() {
  if (!getApps().length) {
    initializeApp({ credential: applicationDefault(), projectId: "fresh-prints-dev" });
  }
  const db = getFirestore();
  const all = await db.collection("printRequests").get();
  const rows = all.docs.map((d) => ({
    id: d.id,
    status: d.data().status,
    queueTab: d.data().queueTab ?? null,
    isInternal: d.data().isInternal ?? null,
  }));
  const editingMismatch = rows.filter((r) => r.status === "editing" && r.queueTab !== "editing");
  const editingOk = rows.filter((r) => r.status === "editing" && r.queueTab === "editing");
  console.log(
    JSON.stringify(
      {
        total: rows.length,
        rows,
        editingOkCount: editingOk.length,
        editingMismatchCount: editingMismatch.length,
        editingMismatch,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
