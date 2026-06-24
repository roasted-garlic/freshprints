import type { ReactNode } from "react";

import { ShellHeaderProvider } from "../context/ShellHeaderProvider";
import { AppHeader } from "./AppHeader";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: ReactNode;
}

function AppShellContent({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <AppHeader />
        <div className="page-content-area">{children}</div>
      </div>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <ShellHeaderProvider>
      <AppShellContent>{children}</AppShellContent>
    </ShellHeaderProvider>
  );
}
