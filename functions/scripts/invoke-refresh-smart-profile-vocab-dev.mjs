/**
 * One-shot DEV invoke: refreshSmartProfileVocabSnapshotCallable (fresh-prints-dev only).
 * Provisions a temporary owner (same pattern as smoke scripts), invokes once, cleans up.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const REPO_ROOT = resolve(import.meta.dirname, "../..");
const FUNCTIONS_ROOT = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));
const { initializeApp: initAdmin } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { initializeApp } = require("firebase/app");
const { getAuth: getClientAuth, signInWithEmailAndPassword } = require("firebase/auth");
const { getFunctions, httpsCallable } = require("firebase/functions");

const PROJECT_ID = "fresh-prints-dev";
const RUN_ID = Date.now().toString(36);
const PASSWORD = `Vocab-${randomBytes(18).toString("base64url")}!aA1`;

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

function str(v) {
  return { stringValue: v };
}
function bool(v) {
  return { booleanValue: v };
}
function ts(date = new Date()) {
  return { timestampValue: date.toISOString() };
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

async function firestoreDelete(accessToken, path) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Firestore DELETE ${path} failed: ${res.status} ${await res.text()}`);
  }
}

async function firestoreGet(accessToken, path) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`get failed ${res.status} ${await res.text()}`);
  return res.json();
}

function decodeFields(fields) {
  if (!fields) return {};
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if ("stringValue" in v) out[k] = v.stringValue;
    else if ("integerValue" in v) out[k] = Number(v.integerValue);
    else if ("doubleValue" in v) out[k] = v.doubleValue;
    else if ("booleanValue" in v) out[k] = v.booleanValue;
    else if ("arrayValue" in v) {
      out[k] = (v.arrayValue.values || []).map((x) => x.stringValue ?? x);
    } else if ("mapValue" in v) out[k] = decodeFields(v.mapValue.fields);
    else out[k] = v;
  }
  return out;
}

async function main() {
  if (PROJECT_ID !== "fresh-prints-dev") {
    throw new Error("Refuse non-dev project");
  }

  const portalEnv = loadPortalEnv();
  if (portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== PROJECT_ID) {
    throw new Error(
      `Portal env project is ${portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID}, expected ${PROJECT_ID}`,
    );
  }

  const accessToken = loadCliAccessToken();
  initAdmin({
    credential: {
      getAccessToken: async () => ({ access_token: accessToken, expires_in: 3600 }),
    },
    projectId: PROJECT_ID,
  });
  const authAdmin = getAuth();

  const email = `vocab-refresh-${RUN_ID}@freshprints.local`;
  const user = await authAdmin.createUser({
    email,
    password: PASSWORD,
    emailVerified: true,
    disabled: false,
  });
  await firestoreUpsert(accessToken, `users/${user.uid}`, {
    role: str("owner"),
    isActive: bool(true),
    email: str(email),
    displayName: str(`Vocab refresh ${RUN_ID}`),
    createdAt: ts(),
    updatedAt: ts(),
  });
  console.log(JSON.stringify({ projectId: PROJECT_ID, tempOwnerUid: user.uid, email }));

  try {
    const app = initializeApp({
      apiKey: portalEnv.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: portalEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: portalEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: portalEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: portalEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: portalEnv.NEXT_PUBLIC_FIREBASE_APP_ID,
    });
    const clientAuth = getClientAuth(app);
    await signInWithEmailAndPassword(clientAuth, email, PASSWORD);
    const functions = getFunctions(app, "us-central1");
    const call = httpsCallable(functions, "refreshSmartProfileVocabSnapshotCallable");

    console.log("Invoking refreshSmartProfileVocabSnapshotCallable once...");
    const result = await call({});
    console.log("CALLABLE_RESULT=" + JSON.stringify(result.data, null, 2));

    const doc = await firestoreGet(accessToken, "settings/aiSmartProfileVocab");
    const data = doc ? decodeFields(doc.fields) : null;
    const dims = [
      "subjects",
      "objects",
      "styles",
      "themes",
      "interests",
      "professionsGroups",
      "occasions",
      "places",
      "colors",
    ];
    const counts = {};
    for (const d of dims) {
      counts[d] = Array.isArray(data?.[d]) ? data[d].length : 0;
    }
    console.log(
      "DOC_META=" +
        JSON.stringify(
          {
            exists: Boolean(doc),
            source: data?.source ?? null,
            refreshedAt: data?.refreshedAt ?? null,
            sampleSize: data?.sampleSize ?? null,
            sampleLimit: data?.sampleLimit ?? null,
            topN: data?.topN ?? null,
            updatedAt: data?.updatedAt ?? null,
            listCounts: counts,
            emptyDims: dims.filter((d) => counts[d] === 0),
          },
          null,
          2,
        ),
    );
  } finally {
    try {
      await firestoreDelete(accessToken, `users/${user.uid}`);
    } catch (error) {
      console.warn("cleanup users doc failed", error);
    }
    try {
      await authAdmin.deleteUser(user.uid);
    } catch (error) {
      console.warn("cleanup auth user failed", error);
    }
    console.log("Temp owner cleaned up");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
