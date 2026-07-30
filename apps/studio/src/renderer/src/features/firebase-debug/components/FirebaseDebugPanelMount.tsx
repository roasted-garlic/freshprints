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
