/**
 * Read-only precheck of approved calibration fixture lifecycle state.
 */
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(__dirname, "../package.json"));
const { initializeApp, applicationDefault, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const ALLOWED_PROJECT = "fresh-prints-dev";

const FIXTURES = [
  { n: 1, id: "yJm2VBRvecPNjx79aSnK", title: "Highland Cow With Bow" },
  { n: 2, id: "6x2LyTvG3ewIePeWHanV", title: "Jimothy Seattle Wildlife…" },
  { n: 3, id: "KI7Ncd1O9JCuX9uCq505", title: "Oops I Got Another Plant Goose" },
  { n: 4, id: "mZWO3Lsra91EhNRNEkhR", title: "Nurse Brain…" },
  { n: 5, id: "W1bwk4jrCoQFn0OiyiSU", title: "Santa" },
  { n: 6, id: "ltn0gzs2YGXPADqCejr8", title: "Summer Vibes Fruits" },
  { n: 7, id: "SrDNWipuL0kBj3EuXY2c", title: "Sarcastic Skeleton" },
  { n: 8, id: "lvTN328EOc9JWazOAs7I", title: "Sarcastic Hand" },
  { n: 9, id: "lbbMZuHQFILqZZmsUWit", title: "keepgrowingB" },
  { n: 10, id: "S9ZeylZt0z0AyA0WFAoX", title: "keepgrowingW" },
  { n: 11, id: "mN90KyEM2rEOmOXeIbaL", title: "stonernikeswish-black" },
  { n: 12, id: "yd2pLu6VsemM2mv9pYUQ", title: "stonernikeswish-white" },
  { n: 13, id: "Vlsg0P2CbuhTlhVmgYU8", title: "Grinch stipple" },
  { n: 14, id: "4rG1uHbmqBtOevnDFon6", title: "Human Rights text" },
  { n: 15, id: "xFrxcn48oXdCmxJCFW9x", title: "too many books" },
  { n: 16, id: "NilC9nqaBALTPgDM1j4q", title: "faith floral" },
  { n: 17, id: "jnw12AWGtI7bCkM7y9KI", title: "Book Reading Skeleton" },
  { n: 18, id: "vVimyNMgfF9jEbJSaNSx", title: "dog mom" },
  { n: 19, id: "SToRmjOZTLwj5upzjijC", title: "HippyRikkylogo" },
  { n: 20, id: "F3lop71TCy9yEAVktY8s", title: "Halloween couple" },
  { n: 21, id: "vMxoB23WlTRIiaTnLkpF", title: "Lastflyingfuck" },
  { n: 22, id: "GIgIAznocv8JJi3gtVCS", title: "Stop Asking… Crazy" },
  { n: 23, id: "9EGDdQJbi2q15UBqE5Sf", title: "HolyCow" },
  { n: 24, id: "QdTEYMNj0GmEk80lPmGq", title: "goat-trans" },
];

function resetEligible(d) {
  const isNeedsReview = d.status === "imported" && d.aiReviewStatus === "needs_review";
  const isRejected = d.status === "rejected";
  return isNeedsReview || isRejected;
}

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID || ALLOWED_PROJECT;
  if (projectId !== ALLOWED_PROJECT) throw new Error("wrong project");
  if (getApps().length === 0) {
    initializeApp({ credential: applicationDefault(), projectId });
  }
  const db = getFirestore();
  const rows = [];
  for (const f of FIXTURES) {
    const snap = await db.collection("designs").doc(f.id).get();
    if (!snap.exists) {
      rows.push({ ...f, found: false, resetEligible: false, blockReason: "not_found" });
      continue;
    }
    const d = snap.data() || {};
    const sp = d.smartProfile || {};
    const prov = sp.provenance || {};
    const eligible = resetEligible(d);
    let blockReason = null;
    if (!eligible) {
      blockReason = `status=${d.status}, aiReviewStatus=${d.aiReviewStatus}`;
    }
    if (!d.previewPath && !d.thumbnailPath) {
      blockReason = (blockReason ? blockReason + "; " : "") + "no_preview";
    }
    rows.push({
      ...f,
      found: true,
      status: d.status,
      aiReviewStatus: d.aiReviewStatus,
      aiProcessingStage: d.aiProcessingStage ?? null,
      promptVersion: prov.promptVersion ?? null,
      normalizerVersion: prov.normalizerVersion ?? null,
      hasPreview: Boolean(d.previewPath || d.thumbnailPath),
      resetEligible: eligible && Boolean(d.previewPath || d.thumbnailPath),
      blockReason,
    });
  }
  const eligible = rows.filter((r) => r.resetEligible);
  const blocked = rows.filter((r) => r.found && !r.resetEligible);
  const missing = rows.filter((r) => !r.found);
  process.stdout.write(
    JSON.stringify({ eligible: eligible.length, blocked: blocked.length, missing: missing.length, rows }, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
