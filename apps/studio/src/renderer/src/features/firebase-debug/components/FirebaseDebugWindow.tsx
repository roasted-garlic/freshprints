import { useEffect, useState } from "react";
import { MemoryRouter } from "react-router-dom";
import type { FirestoreTraceSnapshot } from "@fresh-prints/shared/utils/firestoreUsageTrace";

import {
  closeFirebaseDebugWindow,
  getFirebaseDebugSnapshot,
  sendFirebaseDebugCommand,
  subscribeFirebaseDebugSnapshot,
} from "../services/firebaseDebugWindowService";
import { FirebaseDebugPanel } from "./FirebaseDebugPanel";

export function FirebaseDebugWindow() {
  const [snapshot, setSnapshot] = useState<FirestoreTraceSnapshot | null>(null);

  useEffect(() => {
    void getFirebaseDebugSnapshot().then(setSnapshot);
    return subscribeFirebaseDebugSnapshot(setSnapshot);
  }, []);

  const mainRoute = snapshot?.events.at(-1)?.route ?? snapshot?.routesVisited.at(-1) ?? "/";

  return (
    <MemoryRouter initialEntries={[mainRoute]}>
      <FirebaseDebugPanel
        externalSnapshot={snapshot}
        onClose={closeFirebaseDebugWindow}
        onReset={() => sendFirebaseDebugCommand({ kind: "reset" })}
        onSetTracingEnabled={(enabled) =>
          sendFirebaseDebugCommand({ kind: "setTracingEnabled", enabled })
        }
        route={mainRoute}
      />
    </MemoryRouter>
  );
}
