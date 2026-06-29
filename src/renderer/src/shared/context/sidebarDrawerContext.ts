import { createContext } from "react";

export interface SidebarDrawerContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const SidebarDrawerContext = createContext<SidebarDrawerContextValue | null>(null);
