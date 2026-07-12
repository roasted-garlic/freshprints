/**
 * Temporary Sub-phase F backend smoke harness (fresh-prints-dev only).
 *
 * Usage:
 *   node functions/scripts/smoke-customer-upload-subphase-f.mjs
 *
 * Covers: promote → AI needs_review → approve → ready (Portal-eligible);
 * promote → reject → request item + production Storage preserved.
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
const { getAuth: getClientAuth, signInWithEmailAndPassword } = require("firebase/auth");
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
  updateDoc,
  serverTimestamp,
} = require("firebase/firestore");

const PROJECT_ID = "fresh-prints-dev";
const RUN_ID = Date.now().toString(36);
const PASSWORD = `Smoke-${randomBytes(18).toString("base64url")}!aA1`;
const TERMS = "customer-upload-terms-v2";
const AI_WAIT_MS = 120_000;
const AI_POLL_MS = 3_000;

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

function storageObjectPath(canonicalPath) {
  return canonicalPath.replace(/^\//, "");
}

async function storageObjectExists(accessToken, objectPath, bucketName) {
  const encoded = encodeURIComponent(storageObjectPath(objectPath));
  const url = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encoded}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 404) return false;
  if (!res.ok) {
    throw new Error(`Storage check ${objectPath} failed: ${res.status} ${await res.text()}`);
  }
  return true;
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
  const email = `smoke-f-${label}-${RUN_ID}@freshprints.local`;
  const username = `smoke_f_${label}_${RUN_ID}`.slice(0, 28);
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
    displayName: str(`Smoke F ${label}`),
    createdAt: ts(),
    updatedAt: ts(),
  });
  const customerId = `smoke_f_${label}_${RUN_ID}`;
  await firestoreUpsert(accessToken, `customers/${customerId}`, {
    id: str(customerId),
    userId: str(user.uid),
    username: str(username),
    displayName: str(`Smoke F ${label}`),
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
  const email = `smoke-f-${label}-${RUN_ID}@freshprints.local`;
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
    displayName: str(`Smoke F ${label}`),
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
      pixels[i + 1] = 180;
      pixels[i + 2] = 90;
      pixels[i + 3] = inCenter ? 255 : 0;
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

function clientRequestId(suffix) {
  return `smokef${RUN_ID}${suffix}`.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 128);
}

function formatCallableError(error) {
  return JSON.stringify({
    code: error.code,
    message: error.message,
    details: error.details,
  });
}

async function sleep(ms) {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForNeedsReview(db, designId) {
  const started = Date.now();
  while (Date.now() - started < AI_WAIT_MS) {
    const snap = await getDoc(doc(db, "designs", designId));
    const data = snap.data() ?? {};
    if (data.aiReviewStatus === "needs_review" || data.status === "ready") {
      return data;
    }
    if (data.aiProcessingStage === "failed") {
      throw new Error(`AI processing failed for ${designId}`);
    }
    await sleep(AI_POLL_MS);
  }
  throw new Error(`Timed out waiting for needs_review on ${designId}`);
}

async function main() {
  console.log(`Sub-phase F smoke — project=${PROJECT_ID} run=${RUN_ID}`);

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
  console.log(`Provisioned customer=${customer.uid} owner=${owner.uid}`);

  const firebaseConfig = {
    apiKey: portalEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: portalEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: portalEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: portalEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: portalEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const app = initializeApp(firebaseConfig);
  const staffApp = initializeApp(firebaseConfig, "staff");
  const clientAuth = getClientAuth(app);
  const staffAuth = getClientAuth(staffApp);
  const customerFunctions = getFunctions(app, "us-central1");
  const staffFunctions = getFunctions(staffApp, "us-central1");
  const storage = getStorage(app);
  const customerDb = getFirestore(app);
  const staffDb = getFirestore(staffApp);

  const createBatch = httpsCallable(customerFunctions, "createCustomerUploadBatch");
  const finalizeUpload = httpsCallable(customerFunctions, "finalizeCustomerUpload");
  const confirmAttach = httpsCallable(
    customerFunctions,
    "confirmCustomerUploadsAndAttachToRequest",
  );
  const promoteUpload = httpsCallable(staffFunctions, "promoteCustomerUploadToAiReview");

  async function signInStaff() {
    const cred = await signInWithEmailAndPassword(staffAuth, owner.email, PASSWORD);
    await cred.user.getIdToken(true);
    return cred.user;
  }

  async function attachOne(label) {
    const png = await makeTransparentPng();
    const created = await createBatch({
      mode: "direct_images",
      clientRequestId: clientRequestId(label),
      files: [{ originalFilename: `${label}.png`, declaredSizeBytes: png.byteLength }],
    });
    const uploadId = created.data.uploads?.[0]?.uploadId;
    const batchId = created.data.batchId;
    await uploadBytes(
      ref(storage, storageObjectPath(created.data.uploads[0].sourceStoragePath)),
      png,
      { contentType: "image/png" },
    );
    await finalizeUpload({ uploadId, batchId });
    const attached = await confirmAttach({
      batchId,
      uploadIds: [uploadId],
      ownershipConfirmed: true,
      catalogUseAcknowledged: true,
      termsVersion: TERMS,
      defaultQuantity: 1,
    });
    return {
      uploadId,
      printRequestId: attached.data.printRequestId,
    };
  }

  await signInWithEmailAndPassword(clientAuth, customer.email, PASSWORD);

  let approveFixture;
  let rejectFixture;
  try {
    approveFixture = await attachOne("approve");
    rejectFixture = await attachOne("reject");
    assert(
      "1.attach_two",
      Boolean(approveFixture.uploadId && rejectFixture.uploadId),
      JSON.stringify({ approveFixture, rejectFixture }),
    );
  } catch (error) {
    fail("1.attach_two", formatCallableError(error));
  }

  await signInStaff();

  // --- Approve path ---
  let approveDesignId;
  if (approveFixture?.uploadId) {
    try {
      const promoted = await promoteUpload({ uploadId: approveFixture.uploadId });
      approveDesignId = promoted.data?.designId;
      assert(
        "2.promote_approve_fixture",
        Boolean(approveDesignId) && promoted.data?.enqueueAttempted === true,
        JSON.stringify(promoted.data),
      );
    } catch (error) {
      fail("2.promote_approve_fixture", formatCallableError(error));
    }

    if (approveDesignId) {
      try {
        const design = await waitForNeedsReview(staffDb, approveDesignId);
        assert(
          "3.needs_review",
          design.aiReviewStatus === "needs_review" || design.status === "ready",
          JSON.stringify({
            aiReviewStatus: design.aiReviewStatus,
            status: design.status,
            stage: design.aiProcessingStage,
          }),
        );
      } catch (error) {
        fail("3.needs_review", error.message || String(error));
      }

      try {
        await updateDoc(doc(staffDb, "designs", approveDesignId), {
          status: "ready",
          aiReviewStatus: "approved",
          aiReviewed: true,
          aiProcessed: true,
          aiReviewedBy: owner.uid,
          updatedBy: owner.uid,
          updatedAt: serverTimestamp(),
        });
        const designSnap = await getDoc(doc(staffDb, "designs", approveDesignId));
        const design = designSnap.data();
        assert(
          "4.approve_ready",
          design?.status === "ready" &&
            design?.aiReviewStatus === "approved" &&
            Boolean(design?.title) &&
            Boolean(design?.thumbnailPath),
          JSON.stringify(design),
        );

        const uploadSnap = await getDoc(doc(staffDb, "customerUploads", approveFixture.uploadId));
        assert(
          "5.upload_stays_sent_to_ai",
          uploadSnap.data()?.catalogReviewStatus === "sent_to_ai_review" &&
            uploadSnap.data()?.promotedDesignId === approveDesignId,
          JSON.stringify(uploadSnap.data()),
        );
      } catch (error) {
        fail("4-5.approve", error.message || String(error));
      }
    }
  }

  // Customer Portal catalog eligibility
  if (approveDesignId) {
    try {
      const catalog = await getDocs(
        query(collection(customerDb, "designs"), where("status", "==", "ready")),
      );
      const found = catalog.docs.some((d) => d.id === approveDesignId);
      assert("6.portal_catalog_ready_visible", found, `readyCount=${catalog.size}`);
    } catch (error) {
      fail("6.portal_catalog_ready_visible", error.message || String(error));
    }
  }

  // --- Reject path ---
  let rejectDesignId;
  let productionStoragePath;
  if (rejectFixture?.uploadId) {
    try {
      const uploadSnap = await getDoc(doc(staffDb, "customerUploads", rejectFixture.uploadId));
      productionStoragePath = uploadSnap.data()?.productionStoragePath;
      const promoted = await promoteUpload({ uploadId: rejectFixture.uploadId });
      rejectDesignId = promoted.data?.designId;
      assert("7.promote_reject_fixture", Boolean(rejectDesignId), JSON.stringify(promoted.data));
      await waitForNeedsReview(staffDb, rejectDesignId);
    } catch (error) {
      fail("7.promote_reject_fixture", formatCallableError(error));
    }

    if (rejectDesignId) {
      try {
        await updateDoc(doc(staffDb, "designs", rejectDesignId), {
          status: "rejected",
          aiReviewStatus: "rejected",
          aiReviewed: false,
          aiProcessed: true,
          aiReviewedBy: owner.uid,
          updatedBy: owner.uid,
          updatedAt: serverTimestamp(),
        });
        const designSnap = await getDoc(doc(staffDb, "designs", rejectDesignId));
        assert(
          "8.reject_status",
          designSnap.data()?.status === "rejected",
          JSON.stringify(designSnap.data()),
        );

        const items = await getDocs(
          query(
            collection(staffDb, "printRequestItems"),
            where("printRequestId", "==", rejectFixture.printRequestId),
            where("customerUploadId", "==", rejectFixture.uploadId),
          ),
        );
        assert(
          "9.reject_item_preserved",
          items.size === 1 && items.docs[0].data()?.customerUploadId === rejectFixture.uploadId,
          `size=${items.size}`,
        );

        const exists = await storageObjectExists(
          accessToken,
          productionStoragePath,
          storageBucket,
        );
        assert("10.reject_production_preserved", exists === true, productionStoragePath);

        const designOriginal = designSnap.data()?.originalPath;
        const origExists = await storageObjectExists(accessToken, designOriginal, storageBucket);
        assert("11.reject_design_original_preserved", origExists === true, designOriginal);

        const uploadSnap = await getDoc(doc(staffDb, "customerUploads", rejectFixture.uploadId));
        assert(
          "12.upload_path_unchanged",
          uploadSnap.data()?.productionStoragePath === productionStoragePath &&
            uploadSnap.data()?.catalogReviewStatus === "sent_to_ai_review",
          JSON.stringify(uploadSnap.data()),
        );
      } catch (error) {
        fail("8-12.reject_isolation", error.message || String(error));
      }
    }
  }

  const passed = results.filter((r) => r.ok).length;
  const failedCount = results.filter((r) => !r.ok).length;
  console.log(
    `\nSub-phase F smoke complete — ${passed}/${results.length} PASS (${failedCount} FAIL) run=${RUN_ID}`,
  );
  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
