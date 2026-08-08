import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { setFirestoreUsageTraceContext } from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { SidebarDrawerContext } from "../context/sidebarDrawerContext";
import { ShellHeaderProvider } from "../context/ShellHeaderProvider";
import { UploadActivityProvider } from "../context/UploadActivityProvider";
import { StaffInboxProvider } from "../../features/staff-inbox/components/StaffInboxProvider";
import { StaffInboxToastHost } from "../../features/staff-inbox/components/StaffInboxToastHost";
import { AssistedMessagesProvider } from "../../features/customer-requests/components/AssistedMessagesProvider";
import { installPrintRequestQueueTabBackfillAdminConsole } from "../../features/print-requests/services/printRequestQueueTabBackfillAdminService";
import { installPortalCatalogAlgoliaReconcileAdminConsole } from "../../features/designs/services/portalCatalogAlgoliaReconcileAdminService";
import { installTaxonomyMaterializationBootstrapAdminConsole } from "../../features/designs/services/taxonomyMaterializationBootstrapAdminService";
import { FirebaseDebugPanelMount } from "../../features/firebase-debug/components/FirebaseDebugPanelMount";
import { AppHeader } from "./AppHeader";
import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: ReactNode;
}

function AppShellContent({ children }: AppShellProps) {
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // useLayoutEffect (not useEffect) so the route context updates before any child route's
  // mount/data-fetch effects run — otherwise their trace events would misattribute to the
  // previous route.
  useLayoutEffect(() => {
    setFirestoreUsageTraceContext({ app: "studio", route: location.pathname });
  }, [location.pathname]);

  useEffect(() => {
    const uninstallBackfill = installPrintRequestQueueTabBackfillAdminConsole();
    const uninstallAlgoliaReconcile = installPortalCatalogAlgoliaReconcileAdminConsole();
    const uninstallTaxonomyBootstrap = installTaxonomyMaterializationBootstrapAdminConsole();
    return () => {
      uninstallBackfill();
      uninstallAlgoliaReconcile();
      uninstallTaxonomyBootstrap();
    };
  }, []);

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
      <FirebaseDebugPanelMount />
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
