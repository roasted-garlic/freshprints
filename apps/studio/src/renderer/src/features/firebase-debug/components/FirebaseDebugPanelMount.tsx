import { useEffect } from "react";
import {
  resetFirestoreUsageTraceForTests,
  setFirestoreUsageTraceEnabled,
  subscribeFirestoreUsageTrace,
} from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { isFirebaseDebugPanelEnabledForStudio } from "../utils/firebaseDebugPanelStudioGate";
import {
  useFirebaseDebugPanelShortcut,
} from "../hooks/useFirebaseDebugPanelShortcut";
import {
  openFirebaseDebugWindow,
  publishFirebaseDebugSnapshot,
  subscribeFirebaseDebugCommand,
} from "../services/firebaseDebugWindowService";

/**
 * Mounted once at the app shell. Attaches zero listeners and renders nothing when the dev/project
 * gate is false, keeping production Studio builds unaffected.
 */
export function FirebaseDebugPanelMount() {
  const isEnabled = isFirebaseDebugPanelEnabledForStudio();

  useFirebaseDebugPanelShortcut(isEnabled ? () => void openFirebaseDebugWindow() : () => undefined);

  // Owner QA Amendment 6 follow-up: the AI Processing queue trace is enabled exactly once by the
  // Electron MAIN process (registerAiQueueTraceIpcHandlers, gated on !app.isPackaged), not by
  // either renderer. A renderer-side enable call here was the original defect — the main Studio
  // window and the Firebase Debug window are two separate renderer processes, so each would have
  // independently (and possibly inconsistently) evaluated its own copy of this gate against its
  // own disconnected module-level store, which is why the first cut of this instrumentation always
  // reported `enabled: false` no matter what happened in the app. Both windows are now IPC clients
  // of the one real main-process store (see config/aiQueueTraceClient.ts) and need no local enable
  // call at all.

  useEffect(() => {
    if (!isEnabled) return;
    const unsubscribeSnapshot = subscribeFirestoreUsageTrace(publishFirebaseDebugSnapshot);
    const unsubscribeCommand = subscribeFirebaseDebugCommand((command) => {
      if (command.kind === "reset") {
        resetFirestoreUsageTraceForTests({ app: "studio", enabled: true, route: location.pathname });
        return;
      }
      if (command.enabled) {
        window.localStorage.setItem("FP_FIRESTORE_TRACE", "1");
      } else {
        window.localStorage.removeItem("FP_FIRESTORE_TRACE");
      }
      setFirestoreUsageTraceEnabled(command.enabled);
    });
    return () => {
      unsubscribeSnapshot();
      unsubscribeCommand();
    };
  }, [isEnabled]);

  if (!isEnabled) {
    return null;
  }

  return null;
}
