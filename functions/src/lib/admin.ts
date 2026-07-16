import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

/**
 * Eager Admin app + Auth/Firestore; lazy Storage only.
 *
 * History: fully-lazy Proxy around Firestore broke in production with
 * `app/no-app` ("default Firebase app does not exist") before any business
 * logic ran — so Firecrawl was never called. Top-level Storage + sharp was
 * what made CLI discovery flaky; Auth/Firestore init alone is cheap.
 */
function ensureApp(): App {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0]!;
  }
  return initializeApp();
}

const app = ensureApp();

export const adminAuth: Auth = getAuth(app);
export const adminDb: Firestore = getFirestore(app);

let storageInstance: Storage | undefined;

function getAdminStorage(): Storage {
  if (!storageInstance) {
    storageInstance = getStorage(ensureApp());
  }
  return storageInstance;
}

/** Lazy Storage — avoid touching the Storage client at module import time. */
export const adminStorage: Storage = new Proxy({} as Storage, {
  get(_target, prop) {
    const instance = getAdminStorage();
    const value = Reflect.get(instance as object, prop, instance);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});
