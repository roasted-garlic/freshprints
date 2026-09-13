/**
 * Single-design #1 reproducibility re-run after canary FAIL (Food & Drink).
 * fresh-prints-dev ONLY.
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const FUNCTIONS_ROOT = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));
const { initializeApp: initAdmin, applicationDefault, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase/app");
const { getAuth: getClientAuth, signInWithEmailAndPassword } = require("firebase/auth");
const { getFunctions, httpsCallable } = require("firebase/functions");

const PROJECT_ID = "fresh-prints-dev";
const DESIGN_ID = "7bVlWMFwxECdfHH8VNPB";
const OUT = resolve(REPO_ROOT, "docs/workflow/reviews/_category-dominant-intent-canary-1-rerun.json");
const RUN_ID = Date.now().toString(36);
const PASSWORD = `Cat1Rerun-${randomBytes(12).toString("base64url")}!aA1`;

function loadPortalEnv() {
  const raw = readFileSync(resolve(REPO_ROOT, "apps/portal/.env.local"), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

async function main() {
  if ((process.env.FIREBASE_PROJECT_ID || PROJECT_ID) !== PROJECT_ID) {
    throw new Error("dev only");
  }
  if (getApps().length === 0) {
    initAdmin({
      credential: applicationDefault(),
      projectId: PROJECT_ID,
      storageBucket: `${PROJECT_ID}.firebasestorage.app`,
    });
  }
  const db = getFirestore();
  const authAdmin = getAuth();
  const portalEnv = loadPortalEnv();
  const settings = (await db.collection("settings").doc("aiEnrichment").get()).data() || {};
  if (settings.catalogAutonomousLiveEnabled === true) throw new Error("autonomous on");
  if (settings.catalogWorkflowMode !== "shadow") throw new Error("not shadow");

  const email = `cat1-rerun-${RUN_ID}@freshprints.local`;
  const user = await authAdmin.createUser({ email, password: PASSWORD, emailVerified: true });
  await db.collection("users").doc(user.uid).set({
    role: "owner",
    isActive: true,
    email,
    displayName: `Cat1 Rerun ${RUN_ID}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const app = initializeApp({
    apiKey: portalEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: portalEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: portalEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: portalEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: portalEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  await signInWithEmailAndPassword(getClientAuth(app), email, PASSWORD);
  const enqueue = httpsCallable(getFunctions(app, "us-central1"), "enqueueAiEnrichment");

  const ref = db.collection("designs").doc(DESIGN_ID);
  const beforeSnap = await ref.get();
  const beforeMs = beforeSnap.data()?.updatedAt?.toMillis?.() ?? 0;
  console.log("beforeMs", beforeMs, "cat", beforeSnap.data()?.categoryName || beforeSnap.data()?.aiSuggestions?.categoryName);

  const call = await enqueue({ designId: DESIGN_ID, rerunFromReview: true });
  console.log("callable ok", !!call.data);

  let data = beforeSnap.data();
  for (let i = 0; i < 40; i += 1) {
    await new Promise((r) => setTimeout(r, 5000));
    const snap = await ref.get();
    data = snap.data();
    const ms = data?.updatedAt?.toMillis?.() ?? 0;
    const stage = data?.aiProcessingStage;
    const prompt = data?.smartProfile?.provenance?.promptVersion;
    console.log(`wait ${i + 1} ms=${ms} stage=${stage} prompt=${prompt} cat=${data?.categoryName || data?.aiSuggestions?.categoryName}`);
    if (ms > beforeMs && data?.aiReviewStatus === "needs_review" && prompt === "catalog-enrich-v33") {
      break;
    }
  }

  const sp = data?.smartProfile || {};
  const sug = data?.aiSuggestions || {};
  const out = {
    designId: DESIGN_ID,
    finishedAt: new Date().toISOString(),
    categoryName: data?.categoryName || sug.categoryName,
    title: sug.title,
    description: sug.description,
    subjects: sp.subjects,
    themes: sp.themes,
    visibleText: sp.visibleText,
    tags: sug.tags,
    alternatives: sp.categoryAlternatives,
    promptVersion: sp.provenance?.promptVersion,
    normalizerVersion: sp.provenance?.normalizerVersion,
    automationDecision: sp.provenance?.automationDecision,
    automationReasonCodes: sp.provenance?.automationReasonCodes,
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));

  await authAdmin.deleteUser(user.uid).catch(() => {});
  await db.collection("users").doc(user.uid).delete().catch(() => {});
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
