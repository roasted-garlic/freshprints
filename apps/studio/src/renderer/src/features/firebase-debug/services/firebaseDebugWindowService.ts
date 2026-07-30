import type { FirebaseDebugCommand } from "@fresh-prints/shared/types/firebaseDebug/firebaseDebugIpc.types";
import type { FirestoreTraceSnapshot } from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { firebaseConfig } from "../../../config/env";

export function openFirebaseDebugWindow() {
  const projectId = typeof firebaseConfig.projectId === "string" ? firebaseConfig.projectId : "";
  return window.freshPrints.firebaseDebug.open({ projectId });
}

export function publishFirebaseDebugSnapshot(snapshot: FirestoreTraceSnapshot) {
  window.freshPrints.firebaseDebug.publishSnapshot(snapshot);
}

export function getFirebaseDebugSnapshot() {
  return window.freshPrints.firebaseDebug.getSnapshot();
}

export function subscribeFirebaseDebugSnapshot(
  callback: (snapshot: FirestoreTraceSnapshot) => void,
) {
  return window.freshPrints.firebaseDebug.onSnapshot(callback);
}

export function subscribeFirebaseDebugCommand(callback: (command: FirebaseDebugCommand) => void) {
  return window.freshPrints.firebaseDebug.onCommand(callback);
}

export function sendFirebaseDebugCommand(command: FirebaseDebugCommand) {
  window.freshPrints.firebaseDebug.sendCommand(command);
}

export function closeFirebaseDebugWindow() {
  window.freshPrints.firebaseDebug.close();
}
