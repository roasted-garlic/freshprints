import { FirebaseError } from "firebase/app";
import { getDocs, limit, query } from "firebase/firestore";
import { listAll, ref } from "firebase/storage";

import { app, auth, storage } from "../../../config/firebase";
import { firestoreCollectionService } from "./firestoreCollectionService";
import type {
  FirebaseConnectionCheck,
  FirebaseConnectionResult,
  FirebaseConnectionStatus,
} from "../types/firebaseConnection.types";

const protectedByRulesMessage =
  "Firebase is reachable, but this check is protected by security rules.";

function isProtectedByRules(error: unknown): boolean {
  return (
    error instanceof FirebaseError &&
    (error.code === "permission-denied" || error.code === "storage/unauthorized")
  );
}

function getFailureMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown Firebase connection error.";
}

function createCheck(
  key: FirebaseConnectionCheck["key"],
  label: string,
  status: FirebaseConnectionStatus,
  message: string,
): FirebaseConnectionCheck {
  return {
    key,
    label,
    status,
    message,
  };
}

async function checkFirestore(): Promise<FirebaseConnectionCheck> {
  try {
    const usersQuery = query(firestoreCollectionService.getUsersCollection(), limit(1));
    await getDocs(usersQuery);

    return createCheck("firestore", "Firestore", "connected", "Firestore responded successfully.");
  } catch (error) {
    if (isProtectedByRules(error)) {
      return createCheck("firestore", "Firestore", "protected", protectedByRulesMessage);
    }

    return createCheck("firestore", "Firestore", "failed", getFailureMessage(error));
  }
}

async function checkStorage(): Promise<FirebaseConnectionCheck> {
  try {
    await listAll(ref(storage, "/"));

    return createCheck("storage", "Storage", "connected", "Storage responded successfully.");
  } catch (error) {
    if (isProtectedByRules(error)) {
      return createCheck("storage", "Storage", "protected", protectedByRulesMessage);
    }

    return createCheck("storage", "Storage", "failed", getFailureMessage(error));
  }
}

function getOverallStatus(checks: FirebaseConnectionCheck[]): FirebaseConnectionStatus {
  if (checks.some((check) => check.status === "failed")) {
    return "failed";
  }

  if (checks.some((check) => check.status === "checking")) {
    return "checking";
  }

  return "connected";
}

export const firebaseConnectionService = {
  async checkConnection(): Promise<FirebaseConnectionResult> {
    const projectId = app.options.projectId ?? "unknown project";
    const appCheck = createCheck("app", "Firebase app", "connected", `Initialized project ${projectId}.`);
    const authCheck = auth.app === app
      ? createCheck("auth", "Authentication", "connected", "Firebase Auth is available.")
      : createCheck("auth", "Authentication", "failed", "Firebase Auth is not attached to the initialized app.");
    const [firestoreCheck, storageCheck] = await Promise.all([checkFirestore(), checkStorage()]);
    const checks = [appCheck, authCheck, firestoreCheck, storageCheck];

    return {
      status: getOverallStatus(checks),
      checks,
      checkedAt: new Date(),
    };
  },
};
