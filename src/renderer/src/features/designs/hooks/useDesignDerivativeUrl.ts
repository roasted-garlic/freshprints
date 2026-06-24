import { useEffect, useState } from "react";

import { designDerivativeUrlService } from "../services/designDerivativeUrlService";
import type { DesignDerivativeUrlState } from "../types/designDerivativeUrl.types";

const UNAVAILABLE_STATE: DesignDerivativeUrlState = {
  status: "unavailable",
  url: null,
};

export function useDesignDerivativeUrl(catalogPath?: string): DesignDerivativeUrlState {
  const normalizedPath = catalogPath?.trim() ?? "";
  const [state, setState] = useState<DesignDerivativeUrlState>(() =>
    normalizedPath ? { status: "loading", url: null } : UNAVAILABLE_STATE,
  );

  useEffect(() => {
    if (!normalizedPath) {
      setState(UNAVAILABLE_STATE);
      return;
    }

    let cancelled = false;
    setState({ status: "loading", url: null });

    void designDerivativeUrlService.getDownloadUrlForCatalogPath(normalizedPath).then((url) => {
      if (cancelled) {
        return;
      }

      if (url) {
        setState({ status: "resolved", url });
        return;
      }

      setState(UNAVAILABLE_STATE);
    });

    return () => {
      cancelled = true;
    };
  }, [normalizedPath]);

  return state;
}
