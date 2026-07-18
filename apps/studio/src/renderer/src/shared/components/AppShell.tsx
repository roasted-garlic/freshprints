import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { SidebarDrawerContext } from "../context/sidebarDrawerContext";
import { ShellHeaderProvider } from "../context/ShellHeaderProvider";
import { UploadActivityProvider } from "../context/UploadActivityProvider";
import { StaffInboxProvider } from "../../features/staff-inbox/components/StaffInboxProvider";
import { StaffInboxToastHost } from "../../features/staff-inbox/components/StaffInboxToastHost";
import { AssistedMessagesProvider } from "../../features/customer-requests/components/AssistedMessagesProvider";
import { AppHeader } from "./AppHeader";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: ReactNode;
}

function AppShellContent({ children }: AppShellProps) {
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const drawerValue = useMemo(
    () => ({ isOpen: isDrawerOpen, open: openDrawer, close: closeDrawer }),
    [isDrawerOpen, openDrawer, closeDrawer],
  );

  const pageContentClassName = [
    "page-content-area",
    location.pathname === "/ai-review" ? "page-content-area--ai-review" : "",
    location.pathname === "/designs" ? "page-content-area--design-library" : "",
    location.pathname === "/print-requests" ? "page-content-area--print-requests" : "",
    location.pathname === "/inbox" ? "page-content-area--inbox" : "",
    location.pathname === "/show-queue" ? "page-content-area--show-queue" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <SidebarDrawerContext.Provider value={drawerValue}>
      <div className="app-shell">
        <Sidebar />

        {isDrawerOpen ? (
          <div
            aria-hidden="true"
            className="sidebar-drawer-scrim"
            onClick={closeDrawer}
          />
        ) : null}

        <div className="app-main">
          <AppHeader />
          <div className={pageContentClassName}>{children}</div>
        </div>
      </div>
    </SidebarDrawerContext.Provider>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <UploadActivityProvider>
      <ShellHeaderProvider>
        <StaffInboxProvider>
          <AssistedMessagesProvider>
            <AppShellContent>{children}</AppShellContent>
            <StaffInboxToastHost />
          </AssistedMessagesProvider>
        </StaffInboxProvider>
      </ShellHeaderProvider>
    </UploadActivityProvider>
  );
}
