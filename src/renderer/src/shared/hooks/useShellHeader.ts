import { useContext } from "react";

import { ShellHeaderContext } from "../context/shellHeaderContext";

export function useShellHeader() {
  const context = useContext(ShellHeaderContext);

  if (!context) {
    throw new Error("useShellHeader must be used inside ShellHeaderProvider.");
  }

  return context;
}
