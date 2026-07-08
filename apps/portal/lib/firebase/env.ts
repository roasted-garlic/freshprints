/**
 * Next.js inlines NEXT_PUBLIC_* only for static `process.env.NEXT_PUBLIC_…` access.
 * Do not read these through dynamic keys — that breaks in client bundles.
 */
function readPortalFirebaseEnv() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() ?? '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ?? '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ?? '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() ?? '',
  };
}

export function assertPortalFirebaseEnv(): void {
  const env = readPortalFirebaseEnv();

  if (!env.apiKey) {
    throw new Error('Missing required Firebase environment variable: NEXT_PUBLIC_FIREBASE_API_KEY');
  }

  if (!env.authDomain) {
    throw new Error('Missing required Firebase environment variable: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  }

  if (!env.projectId) {
    throw new Error('Missing required Firebase environment variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  }

  if (!env.storageBucket) {
    throw new Error('Missing required Firebase environment variable: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
  }

  if (!env.messagingSenderId) {
    throw new Error('Missing required Firebase environment variable: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  }

  if (!env.appId) {
    throw new Error('Missing required Firebase environment variable: NEXT_PUBLIC_FIREBASE_APP_ID');
  }
}

export function getPortalFirebaseConfig() {
  assertPortalFirebaseEnv();
  return readPortalFirebaseEnv();
}
