/**
 * Production catch-up: invoke deployed retryPortalCatalogPublication.
 *
 * Minting custom tokens / SA impersonation is blocked for the CLI user, so this
 * creates an ephemeral owner Auth user + Firestore profile (REST), calls the
 * callable, then deletes both. Does not print secrets.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FUNCTIONS_ROOT = resolve(__dirname, "..");
const require = createRequire(resolve(FUNCTIONS_ROOT, "package.json"));

const { initializeApp: initAdmin } = require("firebase-admin/app");
const { getAuth: getAdminAuth } = require("firebase-admin/auth");
const { initializeApp } = require("firebase/app");
const {
  getAuth: getClientAuth,
  signInWithEmailAndPassword,
  signOut,
} = require("firebase/auth");
const { getFunctions, httpsCallable } = require("firebase/functions");

const PROJECT_ID = "fresh-prints-prod";
const WEB_CONFIG = {
  apiKey: "AIzaSyBE9IAFfLwmnanQ4yUxuTtgIT3yTleIvYc",
  authDomain: "fresh-prints-prod.firebaseapp.com",
  projectId: PROJECT_ID,
  storageBucket: "fresh-prints-prod.firebasestorage.app",
  messagingSenderId: "473623863375",
  appId: "1:473623863375:web:524ec1a63f547e4d85ca3a",
};

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

async function main() {
  const accessToken = loadCliAccessToken();
  initAdmin({
    credential: {
      getAccessToken: async () => ({ access_token: accessToken, expires_in: 3600 }),
    },
    projectId: PROJECT_ID,
  });
  const adminAuth = getAdminAuth();

  const runId = Date.now().toString(36);
  const email = `catchup-ops-${runId}@freshprints.local`;
  const password = `CatchUp-${randomBytes(24).toString("base64url")}!aA1`;
  let uid = null;

  try {
    const user = await adminAuth.createUser({
      email,
      password,
      emailVerified: true,
      disabled: false,
      displayName: "Catch-up ops (ephemeral)",
    });
    uid = user.uid;
    console.log(`Created ephemeral owner uid=${uid}`);

    await firestoreUpsert(accessToken, `users/${uid}`, {
      id: str(uid),
      email: str(email),
      displayName: str("Catch-up ops (ephemeral)"),
      role: str("owner"),
      isActive: bool(true),
      createdAt: ts(),
      updatedAt: ts(),
    });

    const app = initializeApp(WEB_CONFIG, `catchup-${runId}`);
    const auth = getClientAuth(app);
    await signInWithEmailAndPassword(auth, email, password);
    console.log("Signed in ephemeral owner");

    const functions = getFunctions(app, "us-central1");
    const call = httpsCallable(functions, "retryPortalCatalogPublication");
    console.log("Calling retryPortalCatalogPublication…");
    const started = Date.now();
    try {
      const result = await call({});
      console.log("OK", JSON.stringify(result.data, null, 2));
      console.log(`durationMs=${Date.now() - started}`);
    } finally {
      await signOut(auth);
    }
  } finally {
    if (uid) {
      try {
        await firestoreDelete(accessToken, `users/${uid}`);
        console.log("Deleted ephemeral Firestore users doc");
      } catch (error) {
        console.error("Cleanup Firestore failed:", error instanceof Error ? error.message : error);
      }
      try {
        await adminAuth.deleteUser(uid);
        console.log("Deleted ephemeral Auth user");
      } catch (error) {
        console.error("Cleanup Auth failed:", error instanceof Error ? error.message : error);
      }
    }
  }
}

main().catch((error) => {
  console.error("FAILED", error?.code || "", error?.message || String(error));
  if (error?.details) console.error("details", JSON.stringify(error.details));
  process.exit(1);
});
