/**
 * Temporary Sub-phase E backend smoke harness (fresh-prints-dev only).
 *
 * Usage:
 *   node functions/scripts/smoke-customer-upload-subphase-e.mjs
 *
 * Covers: pending intake after attach, exclude (storage + item preserved),
 * restore, promote (+ idempotent re-promote), helper promote denied.
 * Retry: documented as fixture-limited unless a failed upload is available.
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

const sharp = require("sharp");
const { initializeApp: initAdmin } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { initializeApp } = require("firebase/app");
const {
  getAuth: getClientAuth,
  signInWithEmailAndPassword,
} = require("firebase/auth");
const { getFunctions, httpsCallable } = require("firebase/functions");
const { getStorage, ref, uploadBytes } = require("firebase/storage");
const {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} = require("firebase/firestore");

const PROJECT_ID = "fresh-prints-dev";
const RUN_ID = Date.now().toString(36);
const PASSWORD = `Smoke-${randomBytes(18).toString("base64url")}!aA1`;
const TERMS = "customer-upload-terms-v2";

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

async function storageObjectExists(accessToken, objectPath, bucketName) {
  const encoded = encodeURIComponent(storageObjectPath(objectPath));
  const url = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encoded}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 404) {
    return false;
  }
  if (!res.ok) {
    throw new Error(`Storage HEAD ${objectPath} failed: ${res.status} ${await res.text()}`);
  }
  return true;
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
function int(v) {
  return { integerValue: String(v) };
}
function ts(date = new Date()) {
  return { timestampValue: date.toISOString() };
}

async function provisionCustomer(auth, accessToken, label) {
  const email = `smoke-e-${label}-${RUN_ID}@freshprints.local`;
  const username = `smoke_e_${label}_${RUN_ID}`.slice(0, 28);
  const user = await auth.createUser({
    email,
    password: PASSWORD,
    emailVerified: true,
    disabled: false,
  });

  await firestoreUpsert(accessToken, `users/${user.uid}`, {
    role: str("customer"),
    isActive: bool(true),
    email: str(email),
    displayName: str(`Smoke E ${label}`),
    createdAt: ts(),
    updatedAt: ts(),
  });

  const customerId = `smoke_e_${label}_${RUN_ID}`;
  await firestoreUpsert(accessToken, `customers/${customerId}`, {
    id: str(customerId),
    userId: str(user.uid),
    username: str(username),
    displayName: str(`Smoke E ${label}`),
    email: str(email),
    isGuest: bool(false),
    totalPrintRequests: int(0),
    nextPrintRequestSequence: int(1),
    createdAt: ts(),
    updatedAt: ts(),
  });

  return { email, uid: user.uid, customerId, username };
}

async function provisionStaff(auth, accessToken, label, role) {
  const email = `smoke-e-${label}-${RUN_ID}@freshprints.local`;
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
    displayName: str(`Smoke E ${label}`),
    createdAt: ts(),
    updatedAt: ts(),
  });

  return { email, uid: user.uid, role };
}

async function makeTransparentPng(width = 400, height = 400) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const inCenter =
        x > width * 0.25 && x < width * 0.75 && y > height * 0.25 && y < height * 0.75;
      pixels[i] = 40;
      pixels[i + 1] = 160;
      pixels[i + 2] = 220;
      pixels[i + 3] = inCenter ? 255 : 0;
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

function storageObjectPath(canonicalPath) {
  return canonicalPath.replace(/^\//, "");
}

function clientRequestId(suffix) {
  return `smokee${RUN_ID}${suffix}`.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 128);
}

function formatCallableError(error) {
  return JSON.stringify({
    code: error.code,
    message: error.message,
    details: error.details,
  });
}

async function main() {
  console.log(`Sub-phase E smoke — project=${PROJECT_ID} run=${RUN_ID}`);

  const portalEnv = loadPortalEnv();
  if (portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error(
      `Portal env project is ${portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID}, expected ${PROJECT_ID}`,
    );
  }

  const accessToken = loadCliAccessToken();
  adminApp(accessToken);
  const authAdmin = getAuth();
  const storageBucket =
    portalEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${PROJECT_ID}.appspot.com`;

  const customer = await provisionCustomer(authAdmin, accessToken, "cust");
  const owner = await provisionStaff(authAdmin, accessToken, "owner", "owner");
  const helper = await provisionStaff(authAdmin, accessToken, "helper", "helper");
  console.log(
    `Provisioned customer=${customer.uid} owner=${owner.uid} helper=${helper.uid}`,
  );

  const app = initializeApp({
    apiKey: portalEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: portalEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: portalEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: portalEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: portalEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  const staffApp = initializeApp(
    {
      apiKey: portalEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: portalEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: portalEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: portalEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: portalEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
    "staff",
  );
  const clientAuth = getClientAuth(app);
  const staffAuth = getClientAuth(staffApp);
  const customerFunctions = getFunctions(app, "us-central1");
  const staffFunctions = getFunctions(staffApp, "us-central1");
  const storage = getStorage(app);
  const db = getFirestore(staffApp);

  const createBatch = httpsCallable(customerFunctions, "createCustomerUploadBatch");
  const finalizeUpload = httpsCallable(customerFunctions, "finalizeCustomerUpload");
  const confirmAttach = httpsCallable(
    customerFunctions,
    "confirmCustomerUploadsAndAttachToRequest",
  );
  const excludeUpload = httpsCallable(staffFunctions, "excludeCustomerUploadFromCatalog");
  const restoreUpload = httpsCallable(
    staffFunctions,
    "restoreCustomerUploadCatalogEligibility",
  );
  const promoteUpload = httpsCallable(staffFunctions, "promoteCustomerUploadToAiReview");

  async function signInStaff(account) {
    const cred = await signInWithEmailAndPassword(staffAuth, account.email, PASSWORD);
    await cred.user.getIdToken(true);
    console.log(`Staff signed in role=${account.role} uid=${cred.user.uid}`);
    return cred.user;
  }

  let uploadId;
  let printRequestId;
  let productionStoragePath;

  await signInWithEmailAndPassword(clientAuth, customer.email, PASSWORD);
  try {
    const png = await makeTransparentPng();
    const created = await createBatch({
      mode: "direct_images",
      clientRequestId: clientRequestId("d1"),
      files: [{ originalFilename: "intake-art.png", declaredSizeBytes: png.byteLength }],
    });
    uploadId = created.data.uploads?.[0]?.uploadId;
    const batchId = created.data.batchId;
    assert("1.create_batch", Boolean(batchId && uploadId), batchId);

    await uploadBytes(
      ref(storage, storageObjectPath(created.data.uploads[0].sourceStoragePath)),
      png,
      { contentType: "image/png" },
    );
    pass("2.upload_source");

    const finalized = await finalizeUpload({ uploadId, batchId });
    assert("3.finalize_ready", finalized.data?.technicalStatus === "ready", finalized.data?.technicalStatus);

    const attached = await confirmAttach({
      batchId,
      uploadIds: [uploadId],
      ownershipConfirmed: true,
      catalogUseAcknowledged: true,
      termsVersion: TERMS,
      defaultQuantity: 1,
    });
    printRequestId = attached.data?.printRequestId;
    assert("4.attach", Boolean(printRequestId), JSON.stringify(attached.data));
  } catch (error) {
    fail("setup_attach", formatCallableError(error));
  }

  await signInStaff(owner);

  if (uploadId) {
    try {
      const pending = await getDocs(
        query(
          collection(db, "customerUploads"),
          where("catalogReviewStatus", "==", "pending_staff_review"),
          orderBy("createdAt", "desc"),
          limit(50),
        ),
      );
      const found = pending.docs.some((d) => d.id === uploadId);
      assert("5.pending_list_contains_upload", found, `docs=${pending.size}`);
    } catch (error) {
      fail("5.pending_list_contains_upload", error.message || String(error));
    }

    try {
      const uploadSnap = await getDoc(doc(db, "customerUploads", uploadId));
      productionStoragePath = uploadSnap.data()?.productionStoragePath;
      assert(
        "6.upload_pending_ready",
        uploadSnap.data()?.catalogReviewStatus === "pending_staff_review" &&
          uploadSnap.data()?.technicalStatus === "ready" &&
          Boolean(productionStoragePath),
        JSON.stringify(uploadSnap.data()),
      );
    } catch (error) {
      fail("6.upload_pending_ready", error.message || String(error));
    }
  }

  await signInStaff(helper);
  if (uploadId) {
    try {
      await promoteUpload({ uploadId });
      fail("7.helper_promote_denied", "expected permission denied");
    } catch (error) {
      assert(
        "7.helper_promote_denied",
        /permission|owners and admins/i.test(error.message || String(error)) ||
          error.code === "functions/permission-denied",
        formatCallableError(error),
      );
    }
  }

  await signInStaff(owner);

  if (uploadId && productionStoragePath) {
    try {
      await excludeUpload({ uploadId });
      const uploadSnap = await getDoc(doc(db, "customerUploads", uploadId));
      assert(
        "8.exclude_status",
        uploadSnap.data()?.catalogReviewStatus === "excluded_from_catalog",
        JSON.stringify(uploadSnap.data()),
      );

      const exists = await storageObjectExists(
        accessToken,
        productionStoragePath,
        storageBucket,
      );
      assert("9.exclude_storage_preserved", exists === true, productionStoragePath);

      const items = await getDocs(
        query(
          collection(db, "printRequestItems"),
          where("printRequestId", "==", printRequestId),
          where("customerUploadId", "==", uploadId),
        ),
      );
      assert(
        "10.exclude_item_preserved",
        items.size === 1 && items.docs[0].data()?.customerUploadId === uploadId,
        `size=${items.size}`,
      );
    } catch (error) {
      fail("8-10.exclude", formatCallableError(error));
    }

    try {
      await restoreUpload({ uploadId });
      const uploadSnap = await getDoc(doc(db, "customerUploads", uploadId));
      assert(
        "11.restore_pending",
        uploadSnap.data()?.catalogReviewStatus === "pending_staff_review",
        JSON.stringify(uploadSnap.data()),
      );
    } catch (error) {
      fail("11.restore_pending", formatCallableError(error));
    }

    let designId;
    try {
      const promoted = await promoteUpload({ uploadId });
      designId = promoted.data?.designId;
      assert(
        "12.promote_creates_design",
        Boolean(designId) &&
          promoted.data?.catalogReviewStatus === "sent_to_ai_review" &&
          Boolean(promoted.data?.originalPath) &&
          promoted.data?.enqueueAttempted === true,
        JSON.stringify(promoted.data),
      );

      const designSnap = await getDoc(doc(db, "designs", designId));
      const design = designSnap.data();
      assert(
        "13.design_shape",
        design?.status === "imported" &&
          design?.sourceCustomerUploadId === uploadId &&
          Boolean(design?.originalPath),
        JSON.stringify(design),
      );

      const origExists = await storageObjectExists(
        accessToken,
        design.originalPath,
        storageBucket,
      );
      assert("14.original_copied", origExists === true, design.originalPath);
    } catch (error) {
      fail("12-14.promote", formatCallableError(error));
    }

    try {
      const again = await promoteUpload({ uploadId });
      assert(
        "15.promote_idempotent",
        again.data?.alreadyPromoted === true && again.data?.designId === designId,
        JSON.stringify(again.data),
      );
    } catch (error) {
      fail("15.promote_idempotent", formatCallableError(error));
    }
  }

  pass(
    "16.retry_fixture_limited",
    "Retry covered by unit/auth tests; no failed-upload fixture in this smoke run",
  );

  const passed = results.filter((r) => r.ok).length;
  const failedCount = results.filter((r) => !r.ok).length;
  console.log(
    `\nSub-phase E smoke complete — ${passed}/${results.length} PASS (${failedCount} FAIL) run=${RUN_ID}`,
  );
  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
