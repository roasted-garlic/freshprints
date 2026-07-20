import { getApps, initializeApp, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getStorage, type Storage } from 'firebase-admin/storage'

let adminApp: App | null = null
let adminInitFailed = false

function readAdminFirebaseConfig(): { projectId: string; storageBucket: string } | null {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    ''
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ?? ''
  if (!projectId || !storageBucket) {
    return null
  }
  return { projectId, storageBucket }
}

/**
 * Firebase Admin for server-only Portal routes (e.g. design share OG meta).
 * Prefer bare `initializeApp({ projectId, storageBucket })` so App Hosting /
 * Cloud Run metadata credentials work (explicit applicationDefault() failed on
 * myprintrequest.dev). Returns null when init is impossible (local without ADC).
 */
export function tryGetPortalAdminApp(): App | null {
  if (adminInitFailed) {
    return null
  }

  if (adminApp) {
    return adminApp
  }

  try {
    const existing = getApps()
    if (existing.length > 0) {
      adminApp = existing[0]!
      return adminApp
    }

    const config = readAdminFirebaseConfig()
    if (!config) {
      adminInitFailed = true
      return null
    }

    adminApp = initializeApp({
      projectId: config.projectId,
      storageBucket: config.storageBucket,
    })
    return adminApp
  } catch {
    adminInitFailed = true
    return null
  }
}

export function tryGetPortalAdminDb(): Firestore | null {
  const app = tryGetPortalAdminApp()
  return app ? getFirestore(app) : null
}

export function tryGetPortalAdminStorage(): Storage | null {
  const app = tryGetPortalAdminApp()
  return app ? getStorage(app) : null
}
