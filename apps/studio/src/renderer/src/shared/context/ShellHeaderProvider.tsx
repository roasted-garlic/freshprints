import { useCallback, useMemo, useState, type ReactNode } from "react";

import { ShellHeaderContext } from "./shellHeaderContext";
import { emptyShellHeaderConfig, type ShellHeaderConfig } from "../types/shellHeader.types";

interface ShellHeaderProviderProps {
  children: ReactNode;
}

export function ShellHeaderProvider({ children }: ShellHeaderProviderProps) {
  const [headerConfig, setHeaderConfigState] = useState<ShellHeaderConfig>(emptyShellHeaderConfig);

  const setHeaderConfig = useCallback((config: ShellHeaderConfig) => {
    setHeaderConfigState(config);
  }, []);

  const value = useMemo(
    () => ({
      headerConfig,
      setHeaderConfig,
    }),
    [headerConfig, setHeaderConfig],
  );

  return <ShellHeaderContext.Provider value={value}>{children}</ShellHeaderContext.Provider>;
}
