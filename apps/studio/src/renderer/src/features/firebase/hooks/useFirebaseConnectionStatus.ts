import { useEffect, useState } from "react";

import { firebaseConnectionService } from "../services/firebaseConnectionService";
import type { FirebaseConnectionResult } from "../types/firebaseConnection.types";

interface FirebaseConnectionState {
  result: FirebaseConnectionResult | null;
  isLoading: boolean;
  error: string | null;
}

export function useFirebaseConnectionStatus() {
  const [state, setState] = useState<FirebaseConnectionState>({
    result: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isCurrent = true;

    void firebaseConnectionService
      .checkConnection()
      .then((result) => {
        if (!isCurrent) {
          return;
        }

        setState({
          result,
          isLoading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (!isCurrent) {
          return;
        }

        setState({
          result: null,
          isLoading: false,
          error: error instanceof Error ? error.message : "Unable to verify Firebase connection.",
        });
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return state;
}
