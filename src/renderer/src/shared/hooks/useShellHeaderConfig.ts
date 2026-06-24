import { useLayoutEffect } from "react";

import { useShellHeader } from "./useShellHeader";
import type { ShellHeaderConfig } from "../types/shellHeader.types";

export function useShellHeaderConfig(config: ShellHeaderConfig) {
  const { setHeaderConfig } = useShellHeader();

  useLayoutEffect(() => {
    setHeaderConfig(config);
  }, [config, setHeaderConfig]);
}
