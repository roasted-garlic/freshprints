/**
 * Sub-phase G automated smoke (fresh-prints-dev only).
 *
 * Usage:
 *   node functions/scripts/smoke-customer-upload-subphase-g.mjs
 *
 * Covers: cleanupAbandonedCustomerUploads dryRun; wipe allowlist still dev-only;
 * wipe plan expansion invariant (shared util).
 */

import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const FUNCTIONS_ROOT = resolve(__dirname, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));

const { initializeApp: initAdmin } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { initializeApp } = require("firebase/app");
const { getAuth: getClientAuth, signInWithEmailAndPassword } = require("firebase/auth");
const { getFunctions, httpsCallable } = require("firebase/functions");

const PROJECT_ID = "fresh-prints-dev";
const RUN_ID = Date.now().toString(36);
const PASSWORD = `Smoke-${randomBytes(18).toString("base64url")}!aA1`;
const ALLOWLIST_SNIPPET = 'OPERATIONAL_WIPE_ALLOWED_PROJECT_IDS = ["fresh-prints-dev"]';
const WIPE_TARGETS_SNIPPET = '"customerUploads"';
const WIPE_UTILS_PATH = resolve(
  REPO_ROOT,
  "packages/shared/src/utils/operationalWipeTargets.ts",
);
const WIPE_TYPES_PATH = resolve(
  REPO_ROOT,
  "packages/shared/src/types/admin/wipeOperationalTestData.types.ts",
);

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.error(`FAIL  ${name} — ${detail}`);
}
function assert(name, condition, detail) {
  if (condition) pass(name, typeof detail === "string" ? detail : "");
  else fail(name, typeof detail === "string" ? detail : "assertion failed");
}

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

function loadCliAccessToken() {
  const conf = JSON.parse(
    readFileSync(resolve(homedir(), ".config/configstore/firebase-tools.json"), "utf8"),
  );
  const token = conf.tokens?.access_token;
  if (!token) throw new Error("Firebase CLI access token missing. Run firebase login.");
  return token;
}

function adminApp(accessToken) {
  return initAdmin({
    credential: {
      getAccessToken: async () => ({ access_token: accessToken, expires_in: 3600 }),
    },
    projectId: PROJECT_ID,
  });
}

async function firestoreUpsert(accessToken, path, fields) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    throw new Error(`Firestore PATCH ${path} failed: ${res.status} ${await res.text()}`);
  }
}

function str(v) {
  return { stringValue: v };
}
function bool(v) {
  return { booleanValue: v };
}
function ts(date = new Date()) {
  return { timestampValue: date.toISOString() };
}

async function provisionStaff(auth, accessToken, label, role) {
  const email = `smoke-g-${label}-${RUN_ID}@freshprints.local`;
  const user = await auth.createUser({
    email,
    password: PASSWORD,
    emailVerified: true,
    disabled: false,
  });
  await firestoreUpsert(accessToken, `users/${user.uid}`, {
    role: str(role),
    isActive: bool(true),
    email: str(email),
    displayName: str(`Smoke G ${label}`),
    createdAt: ts(),
    updatedAt: ts(),
  });
  return { email, uid: user.uid, role };
}

function formatCallableError(error) {
  return JSON.stringify({
    code: error.code,
    message: error.message,
    details: error.details,
  });
}

async function main() {
  console.log(`Sub-phase G smoke — project=${PROJECT_ID} run=${RUN_ID}`);

  assert(
    "0.target_is_dev",
    PROJECT_ID === "fresh-prints-dev",
    PROJECT_ID,
  );

  const typesSource = readFileSync(WIPE_TYPES_PATH, "utf8");
  assert(
    "1.allowlist_dev_only",
    typesSource.includes(ALLOWLIST_SNIPPET) &&
      !typesSource.includes('"fresh-prints-prod"') &&
      typesSource.includes(WIPE_TARGETS_SNIPPET),
    "allowlist or customerUploads target missing in wipe types",
  );

  const utilsSource = readFileSync(WIPE_UTILS_PATH, "utf8");
  assert(
    "2.wipe_plan_customer_uploads",
    utilsSource.includes("wipeCustomerUploadStorage") &&
      utilsSource.includes('CUSTOMER_UPLOAD_STORAGE_WIPE_PREFIXES = ["customer-uploads/"]') &&
      utilsSource.includes('if (target === "customerUploads")'),
    "customerUploads expansion missing in wipe utils",
  );

  assert(
    "3.wipe_plan_select_all_includes_uploads",
    utilsSource.includes('"customerUploads"') &&
      utilsSource.includes("ALL_OPERATIONAL_WIPE_TARGETS"),
    "select-all targets missing customerUploads",
  );

  const portalEnv = loadPortalEnv();
  if (portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error(
      `Portal env project is ${portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID}, expected ${PROJECT_ID}`,
    );
  }

  const accessToken = loadCliAccessToken();
  adminApp(accessToken);
  const authAdmin = getAuth();
  const owner = await provisionStaff(authAdmin, accessToken, "owner", "owner");
  const helper = await provisionStaff(authAdmin, accessToken, "helper", "helper");
  console.log(`Provisioned owner=${owner.uid} helper=${helper.uid}`);

  const app = initializeApp({
    apiKey: portalEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: portalEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: portalEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: portalEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: portalEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  const clientAuth = getClientAuth(app);
  const functions = getFunctions(app, "us-central1");
  const cleanup = httpsCallable(functions, "cleanupAbandonedCustomerUploads");

  await signInWithEmailAndPassword(clientAuth, helper.email, PASSWORD);
  try {
    await cleanup({ dryRun: true });
    fail("4.helper_cleanup_denied", "expected permission denied");
  } catch (error) {
    assert(
      "4.helper_cleanup_denied",
      /permission|owners and admins/i.test(error.message || String(error)) ||
        error.code === "functions/permission-denied",
      formatCallableError(error),
    );
  }

  await signInWithEmailAndPassword(clientAuth, owner.email, PASSWORD);
  await clientAuth.currentUser.getIdToken(true);
  try {
    const res = await cleanup({ dryRun: true });
    assert(
      "5.cleanup_dry_run",
      res.data?.dryRun === true &&
        typeof res.data?.uploadsMarkedAbandoned === "number" &&
        typeof res.data?.batchesMarkedAbandoned === "number" &&
        res.data?.sourceObjectsDeleted === 0,
      JSON.stringify(res.data),
    );
  } catch (error) {
    fail("5.cleanup_dry_run", formatCallableError(error));
  }

  const passed = results.filter((r) => r.ok).length;
  const failedCount = results.filter((r) => !r.ok).length;
  console.log(
    `\nSub-phase G smoke complete — ${passed}/${results.length} PASS (${failedCount} FAIL) run=${RUN_ID}`,
  );
  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
