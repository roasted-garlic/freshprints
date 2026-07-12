/**
 * Temporary Sub-phase C backend smoke harness (fresh-prints-dev only).
 *
 * Usage (from repo root):
 *   node functions/scripts/smoke-customer-upload-subphase-c.mjs
 *
 * Covers: create→finalize→confirm attach, idempotent re-attach, working-request
 * create/reuse, queue-to-show rejection for upload items, cross-customer deny.
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
const { getFirestore, doc, getDoc, collection, query, where, getDocs } = require("firebase/firestore");

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
  if (condition) {
    pass(name, typeof detail === "string" ? detail : "");
  } else {
    fail(name, typeof detail === "string" ? detail : "assertion failed");
  }
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
  if (!token) {
    throw new Error("Firebase CLI access token missing. Run firebase login.");
  }
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
    const body = await res.text();
    throw new Error(`Firestore PATCH ${path} failed: ${res.status} ${body}`);
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
  const email = `smoke-c-${label}-${RUN_ID}@freshprints.local`;
  const username = `smoke_c_${label}_${RUN_ID}`.slice(0, 28);
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
    displayName: str(`Smoke C ${label}`),
    createdAt: ts(),
    updatedAt: ts(),
  });

  const customerId = `smoke_c_${label}_${RUN_ID}`;
  await firestoreUpsert(accessToken, `customers/${customerId}`, {
    id: str(customerId),
    userId: str(user.uid),
    username: str(username),
    displayName: str(`Smoke C ${label}`),
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
      pixels[i] = 220;
      pixels[i + 1] = 40;
      pixels[i + 2] = 40;
      pixels[i + 3] = inCenter ? 255 : 0;
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

function storageObjectPath(canonicalPath) {
  return canonicalPath.replace(/^\//, "");
}

function clientRequestId(suffix) {
  return `smokec${RUN_ID}${suffix}`.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 128);
}

async function main() {
  console.log(`Sub-phase C smoke — project=${PROJECT_ID} run=${RUN_ID}`);

  const portalEnv = loadPortalEnv();
  if (portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error(
      `Portal env project is ${portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID}, expected ${PROJECT_ID}`,
    );
  }

  const accessToken = loadCliAccessToken();
  adminApp(accessToken);
  const authAdmin = getAuth();

  const customerA = await provisionCustomer(authAdmin, accessToken, "a");
  const customerB = await provisionCustomer(authAdmin, accessToken, "b");
  console.log(`Provisioned smoke customers A=${customerA.uid} B=${customerB.uid}`);

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

  function formatCallableError(error) {
    return JSON.stringify({
      code: error.code,
      message: error.message,
      details: error.details,
      customData: error.customData,
    });
  }

  await signInWithEmailAndPassword(clientAuth, customerA.email, PASSWORD);
  console.log(`Signed in A uid=${clientAuth.currentUser?.uid}`);

  try {
    const ping = await createRequest({});
    pass("0.create_request_auth_probe", ping.data?.printRequestId);
  } catch (error) {
    fail("0.create_request_auth_probe", formatCallableError(error));
  }

  const png = await makeTransparentPng();
  let batch;
  let uploadId;

  try {
    const res = await createBatch({
      mode: "direct_images",
      clientRequestId: clientRequestId("d1"),
      files: [{ originalFilename: "attach-art.png", declaredSizeBytes: png.byteLength }],
    });
    batch = res.data;
    uploadId = batch.uploads?.[0]?.uploadId;
    assert("1.create_batch", Boolean(batch?.batchId && uploadId), batch?.batchId);
  } catch (error) {
    fail("1.create_batch", error.message || String(error));
  }

  if (!batch?.uploads?.[0]) {
    console.error("Aborting: no batch.");
  } else {
    const sourcePath = storageObjectPath(batch.uploads[0].sourceStoragePath);
    try {
      await uploadBytes(ref(storage, sourcePath), png, { contentType: "image/png" });
      pass("2.upload_source", sourcePath);
    } catch (error) {
      fail("2.upload_source", error.message || String(error));
    }

    try {
      const res = await finalizeUpload({ uploadId, batchId: batch.batchId });
      assert("3.finalize_ready", res.data?.technicalStatus === "ready", res.data?.technicalStatus);
    } catch (error) {
      fail("3.finalize_ready", error.message || String(error));
    }

    let attach1;
    try {
      const res = await confirmAttach({
        batchId: batch.batchId,
        uploadIds: [uploadId],
        ownershipConfirmed: true,
        catalogUseAcknowledged: true,
        termsVersion: TERMS,
        defaultQuantity: 2,
      });
      attach1 = res.data;
      assert(
        "4.attach_creates_request",
        Boolean(attach1?.printRequestId && attach1.attachedItemIds?.length === 1),
        JSON.stringify(attach1),
      );
    } catch (error) {
      fail("4.attach_creates_request", formatCallableError(error));
    }

    if (attach1?.printRequestId) {
      try {
        const itemSnap = await getDocs(
          query(
            collection(db, "printRequestItems"),
            where("printRequestId", "==", attach1.printRequestId),
            where("customerUploadId", "==", uploadId),
          ),
        );
        const item = itemSnap.docs[0]?.data();
        assert(
          "5.item_upload_shape",
          itemSnap.size === 1 &&
            item?.sourceType === "customer_upload" &&
            !("designId" in (item ?? {})) &&
            item?.quantity === 2,
          JSON.stringify({ size: itemSnap.size, item }),
        );
      } catch (error) {
        fail("5.item_upload_shape", error.message || String(error));
      }

      try {
        const uploadSnap = await getDoc(doc(db, "customerUploads", uploadId));
        const data = uploadSnap.data();
        assert(
          "6.upload_confirmation_persisted",
          data?.ownershipConfirmed === true &&
            data?.catalogUseAcknowledged === true &&
            data?.termsVersion === TERMS &&
            data?.catalogReviewStatus === "pending_staff_review" &&
            data?.printRequestId === attach1.printRequestId,
          JSON.stringify(data),
        );
      } catch (error) {
        fail("6.upload_confirmation_persisted", error.message || String(error));
      }

      let attach2;
      try {
        const res = await confirmAttach({
          batchId: batch.batchId,
          uploadIds: [uploadId],
          ownershipConfirmed: true,
          catalogUseAcknowledged: true,
          termsVersion: TERMS,
        });
        attach2 = res.data;
        assert(
          "7.attach_idempotent",
          attach2.printRequestId === attach1.printRequestId &&
            attach2.attachedItemIds?.length === 0 &&
            attach2.reusedItemIds?.length === 1 &&
            attach2.reusedItemIds[0] === attach1.attachedItemIds[0],
          JSON.stringify(attach2),
        );
      } catch (error) {
        fail("7.attach_idempotent", error.message || String(error));
      }

      try {
        const itemSnap = await getDocs(
          query(
            collection(db, "printRequestItems"),
            where("printRequestId", "==", attach1.printRequestId),
            where("customerUploadId", "==", uploadId),
          ),
        );
        assert("8.no_duplicate_items", itemSnap.size === 1, `count=${itemSnap.size}`);
      } catch (error) {
        fail("8.no_duplicate_items", error.message || String(error));
      }

      try {
        await queueToShow({
          printRequestId: attach1.printRequestId,
          upcomingShowId: "nonexistent-show-for-smoke",
        });
        fail("9.queue_rejected_for_uploads", "expected failed-precondition");
      } catch (error) {
        const message = error.message || String(error);
        assert(
          "9.queue_rejected_for_uploads",
          /not ready for show queue|Custom artwork/i.test(message) ||
            error.code === "functions/failed-precondition",
          message,
        );
      }

      // Confirmations required
      try {
        await confirmAttach({
          batchId: batch.batchId,
          uploadIds: [uploadId],
          ownershipConfirmed: false,
          catalogUseAcknowledged: true,
          termsVersion: TERMS,
        });
        fail("10.confirmations_required", "expected invalid-argument");
      } catch (error) {
        assert(
          "10.confirmations_required",
          /Ownership confirmation|invalid-argument/i.test(error.message || String(error)) ||
            error.code === "functions/invalid-argument",
          error.message || String(error),
        );
      }
    }
  }

  // Cross-customer isolation
  await signOut(clientAuth);
  await signInWithEmailAndPassword(clientAuth, customerB.email, PASSWORD);
  if (batch?.batchId && uploadId) {
    try {
      await confirmAttach({
        batchId: batch.batchId,
        uploadIds: [uploadId],
        ownershipConfirmed: true,
        catalogUseAcknowledged: true,
        termsVersion: TERMS,
      });
      fail("11.cross_customer_denied", "expected permission denied");
    } catch (error) {
      assert(
        "11.cross_customer_denied",
        /permission|do not own|Permission/i.test(error.message || String(error)) ||
          error.code === "functions/permission-denied",
        error.message || String(error),
      );
    }
  }

  // Reuse existing working request on second ready upload
  await signOut(clientAuth);
  await signInWithEmailAndPassword(clientAuth, customerA.email, PASSWORD);
  try {
    const png2 = await makeTransparentPng(420, 420);
    const created = await createBatch({
      mode: "direct_images",
      clientRequestId: clientRequestId("d2"),
      files: [{ originalFilename: "second.png", declaredSizeBytes: png2.byteLength }],
    });
    const upload2 = created.data.uploads[0];
    await uploadBytes(ref(storage, storageObjectPath(upload2.sourceStoragePath)), png2, {
      contentType: "image/png",
    });
    await finalizeUpload({ uploadId: upload2.uploadId, batchId: created.data.batchId });
    const attached = await confirmAttach({
      batchId: created.data.batchId,
      uploadIds: [upload2.uploadId],
      ownershipConfirmed: true,
      catalogUseAcknowledged: true,
      termsVersion: TERMS,
    });
    const firstRequestId = results.find((r) => r.name === "4.attach_creates_request" && r.ok)
      ? undefined
      : undefined;
    // Re-read from last known attach — use item query for customer A
    const requests = await getDocs(
      query(
        collection(db, "printRequests"),
        where("customerId", "==", customerA.customerId),
        where("status", "in", ["draft", "editing"]),
      ),
    );
    assert(
      "12.reuses_working_request",
      requests.size === 1 && attached.data.printRequestId === requests.docs[0].id,
      JSON.stringify({
        requestCount: requests.size,
        attachedId: attached.data.printRequestId,
        workingId: requests.docs[0]?.id,
        firstRequestId,
      }),
    );
  } catch (error) {
    fail("12.reuses_working_request", error.message || String(error));
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nSub-phase C smoke complete — ${passed}/${results.length} PASS (${failed} FAIL) run=${RUN_ID}`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
