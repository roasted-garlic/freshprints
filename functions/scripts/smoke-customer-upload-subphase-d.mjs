/**
 * Temporary Sub-phase D backend smoke harness (fresh-prints-dev only).
 *
 * Usage:
 *   node functions/scripts/smoke-customer-upload-subphase-d.mjs
 *
 * Covers: attach → upload-only queue → mixed queue → catalog-only regression,
 * allocation shapes, and shared source-field builder invariants.
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
  signOut,
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
  setDoc,
  serverTimestamp,
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
function dbl(v) {
  return { doubleValue: v };
}
function ts(date = new Date()) {
  return { timestampValue: date.toISOString() };
}

async function provisionCustomer(auth, accessToken, label) {
  const email = `smoke-d-${label}-${RUN_ID}@freshprints.local`;
  const username = `smoke_d_${label}_${RUN_ID}`.slice(0, 28);
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
    displayName: str(`Smoke D ${label}`),
    createdAt: ts(),
    updatedAt: ts(),
  });
  const customerId = `smoke_d_${label}_${RUN_ID}`;
  await firestoreUpsert(accessToken, `customers/${customerId}`, {
    id: str(customerId),
    userId: str(user.uid),
    username: str(username),
    displayName: str(`Smoke D ${label}`),
    email: str(email),
    isGuest: bool(false),
    totalPrintRequests: int(0),
    nextPrintRequestSequence: int(1),
    createdAt: ts(),
    updatedAt: ts(),
  });
  return { email, uid: user.uid, customerId, username };
}

async function makeTransparentPng(width = 400, height = 400) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const inCenter =
        x > width * 0.25 && x < width * 0.75 && y > height * 0.25 && y < height * 0.75;
      pixels[i] = 200;
      pixels[i + 1] = 40;
      pixels[i + 2] = 40;
      pixels[i + 3] = inCenter ? 255 : 0;
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

function storageObjectPath(p) {
  return p.replace(/^\//, "");
}
function clientRequestId(suffix) {
  return `smoked${RUN_ID}${suffix}`.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 128);
}

async function createReadyUpload(helpers, filename) {
  const { createBatch, finalizeUpload, storage, png } = helpers;
  const created = await createBatch({
    mode: "direct_images",
    clientRequestId: clientRequestId(filename.replace(/\W/g, "").slice(0, 8)),
    files: [{ originalFilename: filename, declaredSizeBytes: png.byteLength }],
  });
  const slot = created.data.uploads[0];
  await uploadBytes(ref(storage, storageObjectPath(slot.sourceStoragePath)), png, {
    contentType: "image/png",
  });
  const finalized = await finalizeUpload({ uploadId: slot.uploadId, batchId: created.data.batchId });
  if (finalized.data.technicalStatus !== "ready") {
    throw new Error(`finalize failed for ${filename}: ${finalized.data.technicalStatus}`);
  }
  return { batchId: created.data.batchId, uploadId: slot.uploadId };
}

async function main() {
  console.log(`Sub-phase D smoke — project=${PROJECT_ID} run=${RUN_ID}`);
  const portalEnv = loadPortalEnv();
  if (portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error(`Portal env project mismatch`);
  }
  const accessToken = loadCliAccessToken();
  adminApp(accessToken);
  const authAdmin = getAuth();
  const customer = await provisionCustomer(authAdmin, accessToken, "a");

  // Ready catalog design for mixed / catalog-only tests
  const designId = `smoke_d_design_${RUN_ID}`;
  await firestoreUpsert(accessToken, `designs/${designId}`, {
    id: str(designId),
    title: str("Smoke D Catalog Design"),
    tags: { arrayValue: { values: [] } },
    status: str("ready"),
    width: int(1000),
    height: int(1000),
    originalPath: str(`/originals/${designId}.png`),
    thumbnailPath: str(`/thumbnails/${designId}.webp`),
    previewPath: str(`/previews/${designId}.webp`),
    printWidthInches: dbl(3),
    printHeightInches: dbl(3),
    requestCount: int(0),
    createdBy: str(customer.uid),
    updatedBy: str(customer.uid),
    createdAt: ts(),
    updatedAt: ts(),
  });

  // Allocatable show in the future
  const showId = `smoke_d_show_${RUN_ID}`;
  const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await firestoreUpsert(accessToken, `upcomingShows/${showId}`, {
    title: str("Smoke D Show"),
    source: str("manual"),
    status: str("scheduled"),
    syncStatus: str("idle"),
    isArchived: bool(false),
    productionStatus: str("not_started"),
    maxQuantityOverridden: bool(false),
    allocatedQuantity: int(0),
    maxTotalQuantity: int(10000),
    accumulatedPrintMs: int(0),
    scheduledStartAt: ts(start),
    createdAt: ts(),
    updatedAt: ts(),
    updatedBy: str(customer.uid),
  });

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
  const storage = getStorage(app);
  const db = getFirestore(app);

  const createBatch = httpsCallable(functions, "createCustomerUploadBatch");
  const finalizeUpload = httpsCallable(functions, "finalizeCustomerUpload");
  const confirmAttach = httpsCallable(functions, "confirmCustomerUploadsAndAttachToRequest");
  const queueToShow = httpsCallable(functions, "queuePortalPrintRequestToShow");
  const createRequest = httpsCallable(functions, "createPortalPrintRequest");

  await signInWithEmailAndPassword(clientAuth, customer.email, PASSWORD);
  const png = await makeTransparentPng();
  const helpers = { createBatch, finalizeUpload, storage, png };

  // --- 1) Upload-only queue ---
  let uploadOnlyRequestId = "";
  try {
    const ready = await createReadyUpload(helpers, "d-upload-only.png");
    const attached = await confirmAttach({
      batchId: ready.batchId,
      uploadIds: [ready.uploadId],
      ownershipConfirmed: true,
      catalogUseAcknowledged: true,
      termsVersion: TERMS,
    });
    uploadOnlyRequestId = attached.data.printRequestId;
    const queued = await queueToShow({
      printRequestId: uploadOnlyRequestId,
      upcomingShowId: showId,
    });
    assert("1.upload_only_queue", queued.data?.allocationIds?.length === 1, JSON.stringify(queued.data));

    const allocSnap = await getDocs(
      query(collection(db, "showAllocations"), where("printRequestId", "==", uploadOnlyRequestId)),
    );
    const alloc = allocSnap.docs[0]?.data();
    assert(
      "2.upload_allocation_shape",
      alloc?.sourceType === "customer_upload" &&
        alloc?.customerUploadId === ready.uploadId &&
        !("designId" in (alloc ?? {})),
      JSON.stringify(alloc),
    );
  } catch (error) {
    fail("1.upload_only_queue", error.message || String(error));
    fail("2.upload_allocation_shape", "skipped");
  }

  // Reset show capacity / create new show for next tests (request is now active)
  const showId2 = `smoke_d_show2_${RUN_ID}`;
  await firestoreUpsert(accessToken, `upcomingShows/${showId2}`, {
    title: str("Smoke D Show 2"),
    source: str("manual"),
    status: str("scheduled"),
    syncStatus: str("idle"),
    isArchived: bool(false),
    productionStatus: str("not_started"),
    maxQuantityOverridden: bool(false),
    allocatedQuantity: int(0),
    maxTotalQuantity: int(10000),
    accumulatedPrintMs: int(0),
    scheduledStartAt: ts(start),
    createdAt: ts(),
    updatedAt: ts(),
    updatedBy: str(customer.uid),
  });

  // --- 3) Mixed catalog + upload (new customer working request after prior became active) ---
  try {
    const created = await createRequest({});
    const mixedRequestId = created.data.printRequestId;

    // Client-create catalog item
    const itemRef = doc(collection(db, "printRequestItems"));
    await setDoc(itemRef, {
      id: itemRef.id,
      printRequestId: mixedRequestId,
      designId,
      quantity: 1,
      printWidthInches: 3,
      printHeightInches: 3,
      status: "pending",
      addedBy: customer.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(
      doc(db, "printRequests", mixedRequestId),
      { itemCount: 1, updatedAt: serverTimestamp(), updatedBy: customer.uid },
      { merge: true },
    );

    const ready = await createReadyUpload(helpers, "d-mixed-upload.png");
    await confirmAttach({
      batchId: ready.batchId,
      uploadIds: [ready.uploadId],
      ownershipConfirmed: true,
      catalogUseAcknowledged: true,
      termsVersion: TERMS,
    });

    const queued = await queueToShow({
      printRequestId: mixedRequestId,
      upcomingShowId: showId2,
    });
    assert("3.mixed_queue", queued.data?.allocationIds?.length === 2, JSON.stringify(queued.data));

    const allocSnap = await getDocs(
      query(collection(db, "showAllocations"), where("printRequestId", "==", mixedRequestId)),
    );
    const shapes = allocSnap.docs.map((d) => d.data());
    const hasCatalog = shapes.some((a) => a.designId === designId && !a.customerUploadId);
    const hasUpload = shapes.some(
      (a) => a.sourceType === "customer_upload" && a.customerUploadId === ready.uploadId && !("designId" in a),
    );
    assert("4.mixed_allocation_shapes", hasCatalog && hasUpload, JSON.stringify(shapes));
  } catch (error) {
    fail("3.mixed_queue", error.message || String(error));
    fail("4.mixed_allocation_shapes", "skipped");
  }

  // --- 5) Catalog-only regression ---
  const showId3 = `smoke_d_show3_${RUN_ID}`;
  await firestoreUpsert(accessToken, `upcomingShows/${showId3}`, {
    title: str("Smoke D Show 3"),
    source: str("manual"),
    status: str("scheduled"),
    syncStatus: str("idle"),
    isArchived: bool(false),
    productionStatus: str("not_started"),
    maxQuantityOverridden: bool(false),
    allocatedQuantity: int(0),
    maxTotalQuantity: int(10000),
    accumulatedPrintMs: int(0),
    scheduledStartAt: ts(start),
    createdAt: ts(),
    updatedAt: ts(),
    updatedBy: str(customer.uid),
  });

  try {
    const created = await createRequest({});
    const catalogRequestId = created.data.printRequestId;
    const itemRef = doc(collection(db, "printRequestItems"));
    await setDoc(itemRef, {
      id: itemRef.id,
      printRequestId: catalogRequestId,
      designId,
      quantity: 2,
      printWidthInches: 3,
      printHeightInches: 3,
      status: "pending",
      addedBy: customer.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(
      doc(db, "printRequests", catalogRequestId),
      { itemCount: 1, updatedAt: serverTimestamp(), updatedBy: customer.uid },
      { merge: true },
    );

    const queued = await queueToShow({
      printRequestId: catalogRequestId,
      upcomingShowId: showId3,
    });
    assert("5.catalog_only_queue", queued.data?.allocationIds?.length === 1, JSON.stringify(queued.data));

    const allocSnap = await getDocs(
      query(collection(db, "showAllocations"), where("printRequestId", "==", catalogRequestId)),
    );
    const alloc = allocSnap.docs[0]?.data();
    assert(
      "6.catalog_allocation_shape",
      alloc?.designId === designId && !alloc?.customerUploadId,
      JSON.stringify(alloc),
    );
  } catch (error) {
    fail("5.catalog_only_queue", error.message || String(error));
    fail("6.catalog_allocation_shape", "skipped");
  }

  // Shared resolver unit already covered offline; sanity-check upload production path on attached upload
  try {
    const uploadDocs = await getDocs(
      query(collection(db, "customerUploads"), where("customerUid", "==", customer.uid)),
    );
    const readyUploads = uploadDocs.docs
      .map((d) => d.data())
      .filter((d) => d.technicalStatus === "ready");
    assert(
      "7.upload_production_paths",
      readyUploads.length > 0 &&
        readyUploads.every(
          (u) =>
            typeof u.productionStoragePath === "string" &&
            /\/customer-uploads\/.+\/production\.png$/.test(u.productionStoragePath),
        ),
      `count=${readyUploads.length}`,
    );
  } catch (error) {
    fail("7.upload_production_paths", error.message || String(error));
  }

  await signOut(clientAuth);

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nSub-phase D smoke complete — ${passed}/${results.length} PASS (${failed} FAIL) run=${RUN_ID}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
