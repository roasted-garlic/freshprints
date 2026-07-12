/**
 * Temporary Sub-phase B backend smoke harness (fresh-prints-dev only).
 *
 * Usage (from repo root):
 *   node functions/scripts/smoke-customer-upload-subphase-b.mjs
 *
 * Auth: uses the local Firebase CLI OAuth token (firebase login) for Admin Auth
 * + Firestore/Storage REST provisioning. Callables/Storage uploads use the
 * Firebase client SDK with ephemeral smoke customers.
 *
 * Does not print secrets. Safe to delete after smoke signoff.
 */

import { createHash, randomBytes } from "node:crypto";
import { deflateRawSync } from "node:zlib";
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
const {
  getStorage,
  ref,
  uploadBytes,
  getBytes,
  getMetadata,
} = require("firebase/storage");
const {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} = require("firebase/firestore");

const PROJECT_ID = "fresh-prints-dev";
const RUN_ID = Date.now().toString(36);
const PASSWORD = `Smoke-${randomBytes(18).toString("base64url")}!aA1`;

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
function ts(date = new Date()) {
  return { timestampValue: date.toISOString() };
}

async function provisionCustomer(auth, accessToken, label) {
  const email = `smoke-b-${label}-${RUN_ID}@freshprints.local`;
  const username = `smoke_b_${label}_${RUN_ID}`.slice(0, 28);
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
    displayName: str(`Smoke B ${label}`),
    createdAt: ts(),
    updatedAt: ts(),
  });

  const customerId = `smoke_${label}_${RUN_ID}`;
  await firestoreUpsert(accessToken, `customers/${customerId}`, {
    userId: str(user.uid),
    username: str(username),
    displayName: str(`Smoke B ${label}`),
    email: str(email),
    isGuest: bool(false),
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

async function makeOpaquePng() {
  return sharp({
    create: {
      width: 400,
      height: 400,
      channels: 3,
      background: { r: 40, g: 120, b: 200 },
    },
  })
    .png()
    .toBuffer();
}

async function makeJpeg() {
  return sharp({
    create: {
      width: 64,
      height: 64,
      channels: 3,
      background: { r: 10, g: 20, b: 30 },
    },
  })
    .jpeg()
    .toBuffer();
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZip(entries) {
  const fileParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const raw = entry.data;
    const compressed = entry.store ? raw : deflateRawSync(raw);
    const method = entry.store ? 0 : 8;
    const crc = crc32(raw);
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);
    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);
    fileParts.push(local, compressed);
    centralParts.push(central);
    offset += local.length + compressed.length;
  }
  const centralDir = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...fileParts, centralDir, end]);
}

function storageObjectPath(canonicalPath) {
  return canonicalPath.replace(/^\//, "");
}

function clientRequestId(suffix) {
  return `smoke${RUN_ID}${suffix}`.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 128);
}

function utcDayKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

async function getRateLimitCounts(db, uid) {
  const id = `${uid}_${utcDayKey()}`;
  const snap = await getDoc(doc(db, "customerUploadRateLimits", id));
  // Clients cannot read this collection — expect permission denied.
  return snap;
}

async function main() {
  console.log(`Sub-phase B smoke — project=${PROJECT_ID} run=${RUN_ID}`);

  const portalEnv = loadPortalEnv();
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
  const finalizeZip = httpsCallable(functions, "finalizeCustomerUploadZip");

  await signInWithEmailAndPassword(clientAuth, customerA.email, PASSWORD);

  // --- 1–5: direct transparent PNG happy path ---
  const transparent = await makeTransparentPng();
  let batch1;
  try {
    const res = await createBatch({
      mode: "direct_images",
      clientRequestId: clientRequestId("d1"),
      files: [{ originalFilename: "art.png", declaredSizeBytes: transparent.byteLength }],
    });
    batch1 = res.data;
    assert(
      "1.create_direct_batch",
      batch1?.batchId && batch1?.uploads?.[0]?.uploadId && batch1?.uploads?.[0]?.sourceStoragePath,
      `batchId=${batch1.batchId}`,
    );
  } catch (error) {
    fail("1.create_direct_batch", error.message || String(error));
  }

  if (!batch1?.uploads?.[0]) {
    console.error("Cannot continue without a direct batch; aborting remaining dependent checks.");
  } else {
  const uploadId = batch1.uploads[0].uploadId;
  const sourcePath = storageObjectPath(batch1.uploads[0].sourceStoragePath);
  globalThis.__smokeUploadId = uploadId;
  globalThis.__smokeSourcePath = sourcePath;

  try {
    await uploadBytes(ref(storage, sourcePath), transparent, { contentType: "image/png" });
    pass("2.upload_transparent_source", sourcePath);
  } catch (error) {
    fail("2.upload_transparent_source", error.message || String(error));
  }

  let finalize1;
  try {
    const res = await finalizeUpload({ uploadId, batchId: batch1.batchId });
    finalize1 = res.data;
    assert(
      "3.finalize_success",
      finalize1?.technicalStatus === "ready" && finalize1?.alreadyReady === false,
      JSON.stringify({
        status: finalize1?.technicalStatus,
        alreadyReady: finalize1?.alreadyReady,
      }),
    );
  } catch (error) {
    fail("3.finalize_success", error.message || String(error));
  }

  let uploadDoc;
  try {
    const snap = await getDoc(doc(db, "customerUploads", uploadId));
    uploadDoc = snap.data();
    assert(
      "4.technicalStatus_ready",
      snap.exists() && uploadDoc?.technicalStatus === "ready",
      `status=${uploadDoc?.technicalStatus}`,
    );
  } catch (error) {
    fail("4.technicalStatus_ready", error.message || String(error));
  }

  for (const [label, pathField] of [
    ["5a.production_png", "productionStoragePath"],
    ["5b.preview_webp", "previewStoragePath"],
    ["5c.thumbnail_webp", "thumbnailStoragePath"],
  ]) {
    try {
      const path = storageObjectPath(String(uploadDoc?.[pathField] ?? ""));
      const meta = await getMetadata(ref(storage, path));
      assert(label, meta.size > 0, `${path} size=${meta.size} type=${meta.contentType}`);
    } catch (error) {
      fail(label, error.message || String(error));
    }
  }

  // --- 6: opaque PNG ---
  try {
    const opaque = await makeOpaquePng();
    const created = (
      await createBatch({
        mode: "direct_images",
        clientRequestId: clientRequestId("opaque"),
        files: [{ originalFilename: "opaque.png", declaredSizeBytes: opaque.byteLength }],
      })
    ).data;
    await uploadBytes(
      ref(storage, storageObjectPath(created.uploads[0].sourceStoragePath)),
      opaque,
      { contentType: "image/png" },
    );
    const fin = (
      await finalizeUpload({
        uploadId: created.uploads[0].uploadId,
        batchId: created.batchId,
      })
    ).data;
    assert(
      "6.opaque_rejected",
      fin.technicalStatus === "failed" &&
        fin.technicalFailureCode === "background_not_transparent" &&
        fin.technicalFailureMessage === "Background is not transparent.",
      JSON.stringify(fin),
    );
  } catch (error) {
    fail("6.opaque_rejected", error.message || String(error));
  }

  // --- 7: JPEG ---
  try {
    const jpeg = await makeJpeg();
    const created = (
      await createBatch({
        mode: "direct_images",
        clientRequestId: clientRequestId("jpeg"),
        files: [{ originalFilename: "photo.jpg", declaredSizeBytes: jpeg.byteLength }],
      })
    ).data;
    await uploadBytes(
      ref(storage, storageObjectPath(created.uploads[0].sourceStoragePath)),
      jpeg,
      { contentType: "image/jpeg" },
    );
    // Storage rules may reject image/jpeg on source — either storage deny or finalize unsupported is OK.
    // If storage rejects, treat as pass for format rejection at boundary; else check finalize.
  } catch (storageError) {
    assert(
      "7.jpeg_unsupported",
      /storage|unauthorized|permission|contentType|forbidden/i.test(String(storageError.message || storageError)),
      `storage rejected JPEG: ${storageError.message || storageError}`,
    );
  }

  // If JPEG upload succeeded despite rules, finalize should fail.
  if (!results.some((r) => r.name === "7.jpeg_unsupported")) {
    try {
      const jpeg = await makeJpeg();
      const created = (
        await createBatch({
          mode: "direct_images",
          clientRequestId: clientRequestId("jpeg2"),
          files: [{ originalFilename: "photo.jpg", declaredSizeBytes: jpeg.byteLength }],
        })
      ).data;
      // Force upload via Admin REST if client rules block — actually if we got here client allowed it.
      await uploadBytes(
        ref(storage, storageObjectPath(created.uploads[0].sourceStoragePath)),
        jpeg,
        { contentType: "image/png" }, // sneak bytes but wrong magic — finalize should still catch
      );
      // Better: upload real jpeg with octet-stream bypass? Rules require png/webp.
      // Re-test with contentType image/webp but jpeg bytes
      await uploadBytes(
        ref(storage, storageObjectPath(created.uploads[0].sourceStoragePath)),
        jpeg,
        { contentType: "image/webp" },
      );
      const fin = (
        await finalizeUpload({
          uploadId: created.uploads[0].uploadId,
          batchId: created.batchId,
        })
      ).data;
      assert(
        "7.jpeg_unsupported",
        fin.technicalStatus === "failed" && fin.technicalFailureCode === "unsupported_format",
        JSON.stringify(fin),
      );
    } catch (error) {
      fail("7.jpeg_unsupported", error.message || String(error));
    }
  }

  // --- 8: re-finalize ready ---
  try {
    // Rate-limit docs are Admin-only; infer no duplicate processing via alreadyReady + same paths.
    const beforePaths = {
      production: uploadDoc?.productionStoragePath,
      preview: uploadDoc?.previewStoragePath,
      thumbnail: uploadDoc?.thumbnailStoragePath,
    };
    const again = (await finalizeUpload({ uploadId, batchId: batch1.batchId })).data;
    const afterSnap = await getDoc(doc(db, "customerUploads", uploadId));
    const after = afterSnap.data();
    assert(
      "8.refinalize_ready_idempotent",
      again.technicalStatus === "ready" &&
        again.alreadyReady === true &&
        after?.productionStoragePath === beforePaths.production &&
        after?.previewStoragePath === beforePaths.preview &&
        after?.thumbnailStoragePath === beforePaths.thumbnail &&
        after?.quotaChargedFinalize === true,
      JSON.stringify({ alreadyReady: again.alreadyReady, quotaChargedFinalize: after?.quotaChargedFinalize }),
    );
  } catch (error) {
    fail("8.refinalize_ready_idempotent", error.message || String(error));
  }

  // --- 9: ZIP with two PNGs ---
  try {
    const png1 = await makeTransparentPng(420, 420);
    const png2 = await makeTransparentPng(440, 440);
    const zipBytes = buildZip([
      { name: "one.png", data: png1, store: true },
      { name: "two.png", data: png2, store: true },
    ]);
    const created = (
      await createBatch({
        mode: "zip",
        clientRequestId: clientRequestId("zip2"),
        declaredZipSizeBytes: zipBytes.byteLength,
      })
    ).data;
    await uploadBytes(ref(storage, storageObjectPath(created.zipStoragePath)), zipBytes, {
      contentType: "application/zip",
    });
    const fin = (await finalizeZip({ batchId: created.batchId })).data;
    const fileResults = Array.isArray(fin.files) ? fin.files : [];
    // Prefer callable payload (authoritative); optionally confirm owner can read one upload doc.
    let ownerReadOk = false;
    if (fileResults[0]?.uploadId) {
      try {
        const one = await getDoc(doc(db, "customerUploads", fileResults[0].uploadId));
        ownerReadOk = one.exists() && one.data()?.technicalStatus === "ready";
      } catch {
        ownerReadOk = false;
      }
    }
    assert(
      "9.zip_two_pngs",
      fin.zipExtractionStatus === "complete" &&
        Number(fin.readyCount) === 2 &&
        fileResults.length === 2 &&
        fileResults.every((f) => f.technicalStatus === "ready") &&
        ownerReadOk,
      JSON.stringify({
        zipExtractionStatus: fin.zipExtractionStatus,
        readyCount: fin.readyCount,
        files: fileResults.map((f) => ({ id: f.uploadId, status: f.technicalStatus })),
        ownerReadOk,
      }),
    );
  } catch (error) {
    fail("9.zip_two_pngs", error.message || String(error));
  }

  // --- 10: nested ZIP rejected ---
  try {
    const nested = buildZip([{ name: "nested.zip", data: Buffer.from("not-a-zip"), store: true }]);
    const created = (
      await createBatch({
        mode: "zip",
        clientRequestId: clientRequestId("nested"),
        declaredZipSizeBytes: nested.byteLength,
      })
    ).data;
    await uploadBytes(ref(storage, storageObjectPath(created.zipStoragePath)), nested, {
      contentType: "application/zip",
    });
    let rejected = false;
    let message = "";
    try {
      await finalizeZip({ batchId: created.batchId });
    } catch (error) {
      rejected = true;
      message = error.message || String(error);
    }
    const batchSnap = await getDoc(doc(db, "customerUploadBatches", created.batchId));
    const batchData = batchSnap.data();
    assert(
      "10.nested_zip_rejected",
      rejected ||
        batchData?.zipExtractionStatus === "failed" ||
        batchData?.technicalFailureCode === "nested_archive_rejected",
      message || JSON.stringify({ status: batchData?.zipExtractionStatus, code: batchData?.technicalFailureCode }),
    );
  } catch (error) {
    fail("10.nested_zip_rejected", error.message || String(error));
  }

  // --- 11: second customer isolation ---
  await signOut(clientAuth);
  await signInWithEmailAndPassword(clientAuth, customerB.email, PASSWORD);
  try {
    let firestoreDenied = false;
    try {
      const snap = await getDoc(doc(db, "customerUploads", uploadId));
      firestoreDenied = !snap.exists(); // rules should deny; client may throw or return empty depending on SDK
      if (snap.exists()) {
        firestoreDenied = false;
      }
    } catch {
      firestoreDenied = true;
    }

    let storageDenied = false;
    try {
      await getBytes(ref(storage, sourcePath));
      storageDenied = false;
    } catch {
      storageDenied = true;
    }

    assert(
      "11.cross_customer_isolation",
      firestoreDenied && storageDenied,
      `firestoreDenied=${firestoreDenied} storageDenied=${storageDenied}`,
    );
  } catch (error) {
    fail("11.cross_customer_isolation", error.message || String(error));
  }

  // --- 12: 11th batch create rejected (use customer B; fresh UID day counter) ---
  try {
    let rejectedAt = null;
    for (let i = 1; i <= 11; i += 1) {
      try {
        await createBatch({
          mode: "direct_images",
          clientRequestId: clientRequestId(`q${i}`),
          files: [{ originalFilename: `q${i}.png`, declaredSizeBytes: 1024 }],
        });
        if (i === 11) {
          rejectedAt = null;
        }
      } catch (error) {
        if (i === 11) {
          rejectedAt = error.message || String(error);
          break;
        }
        throw error;
      }
    }
    assert(
      "12.eleventh_batch_rejected",
      typeof rejectedAt === "string" && /limit|resource|exhausted|today/i.test(rejectedAt),
      rejectedAt || "11th create unexpectedly succeeded",
    );
  } catch (error) {
    fail("12.eleventh_batch_rejected", error.message || String(error));
  }

  // --- 13: Portal has no upload UI ---
  try {
    const { readdirSync, readFileSync: read, statSync } = await import("node:fs");
    const hits = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const p = resolve(dir, name);
        const st = statSync(p);
        if (st.isDirectory()) {
          if (name === "node_modules" || name === ".next") continue;
          walk(p);
        } else if (/\.(ts|tsx)$/.test(name)) {
          const text = read(p, "utf8");
          if (
            /createCustomerUploadBatch|finalizeCustomerUpload|customer-uploads|CustomerUpload|Upload artwork/i.test(
              text,
            )
          ) {
            hits.push(p.replace(REPO_ROOT + "\\", ""));
          }
        }
      }
    };
    walk(resolve(REPO_ROOT, "apps/portal"));
    assert("13.no_portal_upload_ui", hits.length === 0, hits.join(", ") || "no matches");
  } catch (error) {
    fail("13.no_portal_upload_ui", error.message || String(error));
  }

  } // end dependent checks when direct batch exists

  // Cleanup auth users (best-effort)
  for (const c of [customerA, customerB]) {
    try {
      await authAdmin.deleteUser(c.uid);
    } catch {
      // ignore
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n--- Summary ---");
  console.log(`passed=${results.filter((r) => r.ok).length} failed=${failed.length}`);
  if (failed.length) {
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
    process.exit(1);
  } else {
    console.log("All Sub-phase B smoke checks passed.");
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("Smoke harness crashed:", error);
  process.exitCode = 1;
});
