import { useContext } from "react";

import { SidebarDrawerContext } from "../context/sidebarDrawerContext";

export function useSidebarDrawer() {
  const context = useContext(SidebarDrawerContext);

  if (!context) {
    throw new Error("useSidebarDrawer must be used within AppShell");
  }

  return context;
}
