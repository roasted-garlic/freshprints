import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { ShellHeaderProvider } from "../context/ShellHeaderProvider";
import { AppHeader } from "./AppHeader";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: ReactNode;
}

function AppShellContent({ children }: AppShellProps) {
  const location = useLocation();
  const pageContentClassName = [
    "page-content-area",
    location.pathname === "/ai-review" ? "page-content-area--ai-review" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <AppHeader />
        <div className={pageContentClassName}>{children}</div>
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
