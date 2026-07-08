'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

import { getPortalFirebaseConfig } from './env';

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let functionsInstance: Functions | null = null;
let storageInstance: FirebaseStorage | null = null;

function getFirebaseApp(): FirebaseApp {
  if (appInstance) {
    return appInstance;
  }

  appInstance = getApps().length > 0 ? getApp() : initializeApp(getPortalFirebaseConfig());
  return appInstance;
}

export function getPortalAuth(): Auth {
  authInstance ??= getAuth(getFirebaseApp());
  return authInstance;
}

export function getPortalDb(): Firestore {
  dbInstance ??= getFirestore(getFirebaseApp());
  return dbInstance;
}

export function getPortalFunctions(): Functions {
  functionsInstance ??= getFunctions(getFirebaseApp());
  return functionsInstance;
}

export function getPortalStorage(): FirebaseStorage {
  storageInstance ??= getStorage(getFirebaseApp());
  return storageInstance;
}
