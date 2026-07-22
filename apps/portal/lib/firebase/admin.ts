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
 * True when this process is likely to resolve Google credentials without a long
 * GCE metadata-server probe (which hangs ~10–20s on local `next dev` without ADC).
 */
function canUsePortalAdminCredentials(): boolean {
  if (process.env.PORTAL_ADMIN_FORCE?.trim() === '1') {
    return true
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    return true
  }
  // App Hosting / Cloud Run / Cloud Functions — metadata credentials available.
  if (
    process.env.K_SERVICE ||
    process.env.FUNCTION_TARGET ||
    process.env.FIREBASE_CONFIG ||
    process.env.GAE_SERVICE
  ) {
    return true
  }

  return false
}

/**
 * Firebase Admin for server-only Portal routes (e.g. design share OG meta).
 * Prefer bare `initializeApp({ projectId, storageBucket })` so App Hosting /
 * Cloud Run metadata credentials work (explicit applicationDefault() failed on
 * myprintrequest.dev).
 *
 * Returns null when project env is missing, or when local/dev would create an app
 * that hangs on the first Firestore/Storage RPC without ADC. Opt in locally with
 * `GOOGLE_APPLICATION_CREDENTIALS` or `PORTAL_ADMIN_FORCE=1`.
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

    if (!canUsePortalAdminCredentials()) {
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
