import { useEffect } from "react";
import {
  resetFirestoreUsageTraceForTests,
  setFirestoreUsageTraceEnabled,
  subscribeFirestoreUsageTrace,
} from "@fresh-prints/shared/utils/firestoreUsageTrace";
import { setAiQueueTraceEnabled } from "@fresh-prints/shared/utils/aiQueueTrace";

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

  // Owner QA Amendment 6: the AI Processing queue trace shares this same dev-build +
  // dev-project gate, so it can never activate in a production Studio package. Unlike the
  // Firestore tracer it needs no localStorage opt-in — the owner's reproduction is a one-shot
  // "import three designs, then copy the trace" flow, and requiring a flag-then-reload would
  // discard the very pump activity being investigated.
  useEffect(() => {
    setAiQueueTraceEnabled(isEnabled);
    return () => {
      setAiQueueTraceEnabled(false);
    };
  }, [isEnabled]);

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
