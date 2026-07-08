import type { FirebaseOptions } from "firebase/app";

interface FirebaseEnv {
  VITE_FIREBASE_API_KEY: string;
  VITE_FIREBASE_AUTH_DOMAIN: string;
  VITE_FIREBASE_PROJECT_ID: string;
  VITE_FIREBASE_STORAGE_BUCKET: string;
  VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  VITE_FIREBASE_APP_ID: string;
}

const requiredFirebaseEnvKeys: Array<keyof FirebaseEnv> = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

function getRequiredEnvValue(key: keyof FirebaseEnv): string {
  const value = import.meta.env[key];

  if (!value) {
    throw new Error(`Missing required Firebase environment variable: ${key}`);
  }

  return value;
}

export function validateFirebaseEnv(): FirebaseEnv {
  return requiredFirebaseEnvKeys.reduce<FirebaseEnv>(
    (envValues, key) => ({
      ...envValues,
      [key]: getRequiredEnvValue(key),
    }),
    {
      VITE_FIREBASE_API_KEY: "",
      VITE_FIREBASE_AUTH_DOMAIN: "",
      VITE_FIREBASE_PROJECT_ID: "",
      VITE_FIREBASE_STORAGE_BUCKET: "",
      VITE_FIREBASE_MESSAGING_SENDER_ID: "",
      VITE_FIREBASE_APP_ID: "",
    },
  );
}

const firebaseEnv = validateFirebaseEnv();

export const firebaseConfig: FirebaseOptions = {
  apiKey: firebaseEnv.VITE_FIREBASE_API_KEY,
  authDomain: firebaseEnv.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket: firebaseEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseEnv.VITE_FIREBASE_APP_ID,
};
