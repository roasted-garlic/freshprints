import { createContext } from "react";

import type { ShellHeaderConfig } from "../types/shellHeader.types";

export interface ShellHeaderContextValue {
  headerConfig: ShellHeaderConfig;
  setHeaderConfig: (config: ShellHeaderConfig) => void;
}

export const ShellHeaderContext = createContext<ShellHeaderContextValue | null>(null);
