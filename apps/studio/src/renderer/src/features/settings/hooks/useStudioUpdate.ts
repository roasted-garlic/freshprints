import { useCallback, useEffect, useState } from "react";

import type { StudioUpdateState } from "@fresh-prints/shared/types/studioUpdate/studioUpdateIpc.types";

const FALLBACK_STATE: StudioUpdateState = {
  status: "idle",
  channel: "stable",
  currentVersion: "",
  isUpdateCapable: false,
  availableRelease: null,
  downloadProgress: null,
  isPostponed: false,
  errorMessage: null,
  lastCheckedAt: null,
};

export function useStudioUpdate() {
  const [state, setState] = useState<StudioUpdateState>(FALLBACK_STATE);

  useEffect(() => {
    let isMounted = true;

    void window.freshPrints.studioUpdate.getState().then((result) => {
      if (isMounted && result.success) {
        setState(result.data);
      }
    });

    const unsubscribe = window.freshPrints.studioUpdate.onStateChanged((next) => {
      if (isMounted) {
        setState(next);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const checkForUpdate = useCallback(async () => {
    const result = await window.freshPrints.studioUpdate.checkForUpdate();
    if (result.success) {
      setState(result.data.state);
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    const result = await window.freshPrints.studioUpdate.downloadUpdate();
    if (result.success) {
      setState(result.data.state);
    }
  }, []);

  const restartAndInstall = useCallback(async () => {
    await window.freshPrints.studioUpdate.restartAndInstall();
  }, []);

  const postpone = useCallback(async () => {
    const result = await window.freshPrints.studioUpdate.postpone();
    if (result.success) {
      setState(result.data.state);
    }
  }, []);

  return { checkForUpdate, downloadUpdate, postpone, restartAndInstall, state };
}
