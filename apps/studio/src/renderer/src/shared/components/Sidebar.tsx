import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Bug,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  DatabaseZap,
  Images,
  LogOut,
  MessageSquare,
  Settings,
  Sparkles,
  FolderInput,
  Upload,
  Users,
  X,
  Bell,
  Clapperboard,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

import { useAuth } from "../../features/auth/hooks/useAuth";
import { usePendingCustomerUploadCount } from "../../features/customer-uploads/hooks/usePendingCustomerUploadCount";
import { useStaffInboxContext } from "../../features/staff-inbox/context/staffInboxContext";
import { permissionService } from "../../features/permissions/services/permissionService";
import type { PermissionKey } from "../../features/permissions/types/permission.types";
import { isOperationalWipeUiEnabled } from "../../features/test-data-reset/utils/operationalWipeUiGate";
import { useSidebarDrawer } from "../hooks/useSidebarDrawer";
import { useUploadActivity } from "../hooks/useUploadActivity";
import { desktopAppService } from "../services/desktopAppService";
import { isElectronDesktop } from "../utils/isElectronDesktop";
import { AppLogo } from "./AppLogo";
import { Badge } from "./Badge";
import { formatTeamUserRoleLabel, getTeamUserRoleBadgeVariant } from "../../features/users/utils/teamUserRoleDisplay";

interface SidebarRouteItem {
  kind: "route";
  icon: LucideIcon;
  label: string;
  to: string;
  end?: boolean;
  isDisabled?: boolean;
  dividerBefore?: boolean;
  permission?: PermissionKey;
  showInboxBadge?: boolean;
  showCustomerUploadBadge?: boolean;
  /** Extra client-side visibility gate beyond permission (e.g. allowlisted Firebase project). */
  isVisible?: () => boolean;
}

interface SidebarActionItem {
  kind: "action";
  icon: LucideIcon;
  label: string;
  onClick: () => void | Promise<void>;
  isLoading?: boolean;
  dividerBefore?: boolean;
  permission?: PermissionKey;
}

type SidebarItem = SidebarRouteItem | SidebarActionItem;

const sidebarItems: SidebarRouteItem[] = [
  { kind: "route", icon: Images, label: "Design Library", to: "/designs", permission: "viewDesigns" },
  {
    kind: "route",
    icon: Bell,
    label: "Inbox",
    to: "/inbox",
    permission: "viewPrintRequests",
    showInboxBadge: true,
    dividerBefore: true,
  },
  {
    kind: "route",
    icon: Clapperboard,
    label: "Show Queue",
    to: "/show-queue",
    permission: "viewUpcomingShows",
  },
  {
    kind: "route",
    icon: ClipboardList,
    label: "Print Requests",
    to: "/print-requests",
    permission: "viewPrintRequests",
  },
  {
    kind: "route",
    icon: FolderInput,
    label: "Imports",
    to: "/imports",
    permission: "importDesigns",
    dividerBefore: true,
  },
  {
    kind: "route",
    icon: Upload,
    label: "Customer Uploads",
    to: "/customer-uploads",
    permission: "importDesigns",
    showCustomerUploadBadge: true,
  },
  {
    kind: "route",
    icon: Sparkles,
    label: "AI Processing",
    to: "/ai-review",
    permission: "viewAiReview",
  },
  {
    kind: "route",
    icon: MessageSquare,
    label: "Customer Requests",
    to: "/customer-requests",
    permission: "manageRequests",
    isDisabled: true,
  },
  {
    kind: "route",
    icon: Users,
    label: "Users",
    to: "/users",
    permission: "viewUsers",
    dividerBefore: true,
  },
  { kind: "route", icon: Settings, label: "Settings", to: "/settings", permission: "manageSettings" },
  {
    kind: "route",
    icon: DatabaseZap,
    label: "Test Data",
    to: "/test-data-reset",
    permission: "manageSettings",
    isVisible: isOperationalWipeUiEnabled,
  },
];

const showDevToolsSidebarAction = import.meta.env.DEV && isElectronDesktop();

const sidebarCollapsedStorageKey = "fresh-prints-sidebar-collapsed";

function getStoredSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(sidebarCollapsedStorageKey) === "true";
  } catch {
    return false;
  }
}

export function Sidebar() {
  const { isAuthActionLoading, logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLElement>(null);
  const [isIndicatorVisible, setIsIndicatorVisible] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => getStoredSidebarCollapsed());
  const [isOpeningDevTools, setIsOpeningDevTools] = useState(false);
  const { isOpen: isDrawerOpen, close: closeDrawer } = useSidebarDrawer();
  const { isUploadActive, requestLeaveConfirmation } = useUploadActivity();
  const staffInbox = useStaffInboxContext();
  const pendingCustomerUploadCount = usePendingCustomerUploadCount();

  const inboxOpenCount = staffInbox.isEnabled ? staffInbox.badgeCounts.printRequests : 0;

  const resolveSidebarBadgeCount = useCallback(
    (item: SidebarRouteItem) => {
      if (item.showInboxBadge) {
        if (!staffInbox.isEnabled) {
          return 0;
        }
        return inboxOpenCount;
      }

      if (item.showCustomerUploadBadge) {
        return pendingCustomerUploadCount;
      }

      return 0;
    },
    [inboxOpenCount, pendingCustomerUploadCount, staffInbox.isEnabled],
  );

  const handleOpenDevTools = useCallback(async () => {
    setIsOpeningDevTools(true);

    try {
      await desktopAppService.openDevTools();
    } catch (error) {
      console.error(
        error instanceof Error ? error.message : "Unable to open DevTools. Please try again.",
      );
    } finally {
      setIsOpeningDevTools(false);
    }
  }, []);

  const devToolsAction: SidebarActionItem | null =
    showDevToolsSidebarAction && permissionService.hasPermission(user, "accessDashboard")
      ? {
          kind: "action",
          icon: Bug,
          label: "Dev Tools",
          onClick: () => {
            void handleOpenDevTools();
          },
          isLoading: isOpeningDevTools,
        }
      : null;

  const visibleSidebarItems: SidebarItem[] = [
    ...sidebarItems.filter(
      (item) =>
        (!item.permission || permissionService.hasPermission(user, item.permission)) &&
        (!item.isVisible || item.isVisible()),
    ),
    ...(devToolsAction ? [devToolsAction] : []),
  ];

  useEffect(() => {
    closeDrawer();
  }, [location.pathname, closeDrawer]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((currentValue) => !currentValue);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(sidebarCollapsedStorageKey, String(isCollapsed));
    } catch {
      // Ignore storage failures.
    }
  }, [isCollapsed]);

  const updateActiveIndicator = useCallback(() => {
    const sidebar = sidebarRef.current;

    if (!sidebar) {
      return;
    }

    const activeLink = sidebar.querySelector<HTMLElement>(".sidebar-link-active");

    if (!activeLink || sidebar.clientHeight === 0) {
      setIsIndicatorVisible(false);
      return;
    }

    setIsIndicatorVisible(true);
  }, []);

  useLayoutEffect(() => {
    updateActiveIndicator();
  }, [isCollapsed, location.pathname, updateActiveIndicator, visibleSidebarItems.length]);

  useEffect(() => {
    const sidebar = sidebarRef.current;

    if (!sidebar || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateActiveIndicator();
    });

    observer.observe(sidebar);
    return () => observer.disconnect();
  }, [updateActiveIndicator]);

  // When already browsing the Design Library in request-selection mode, keep the sidebar
  // link pointed at the current URL (with its mode/requestId params) so clicking it does
  // not silently drop selection mode. Leaving the Library via any other link still exits it.
  const resolveSidebarItemTo = useCallback(
    (item: SidebarRouteItem) => {
      if (
        item.to === "/designs" &&
        location.pathname === "/designs" &&
        new URLSearchParams(location.search).get("mode") === "request-selection"
      ) {
        return `${location.pathname}${location.search}`;
      }

      return item.to;
    },
    [location.pathname, location.search],
  );

  const handleNavLinkClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, to: string) => {
      // Active workflows are page-owned, so the guard fires when the user clicks a different
      // route while the current page has registered leave-protection.
      if (!isUploadActive || to === location.pathname) {
        return;
      }

      // Block navigation immediately (not just visually) — the confirm dialog is rendered by
      // `UploadActivityProvider` at the app-shell level, above this click handler resolving.
      event.preventDefault();

      void requestLeaveConfirmation().then((confirmed) => {
        if (confirmed) {
          navigate(to);
        }
      });
    },
    [isUploadActive, location.pathname, navigate, requestLeaveConfirmation],
  );

  const displayName = user?.displayName ?? "Fresh Prints user";

  const asideClassName = [
    "sidebar",
    isCollapsed ? "sidebar-collapsed" : "",
    isDrawerOpen ? "sidebar-drawer-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside
      aria-label="Primary navigation"
      className={asideClassName}
      ref={sidebarRef}
    >
      <span
        aria-hidden="true"
        className={`sidebar-active-indicator ${isIndicatorVisible ? "sidebar-active-indicator-visible" : ""}`.trim()}
      />
      <div className="sidebar-brand">
        <AppLogo className="sidebar-logo" size="md" />
        {!isCollapsed ? <p className="sidebar-brand-title">Fresh Prints</p> : null}
        <button
          aria-label="Close navigation menu"
          className="sidebar-drawer-close"
          onClick={closeDrawer}
          type="button"
        >
          <X aria-hidden="true" size={18} strokeWidth={2} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {visibleSidebarItems.map((item) => {
          const ItemIcon = item.icon;
          const badgeCount = item.kind === "route" ? resolveSidebarBadgeCount(item) : 0;

          return (
            <div className="sidebar-nav-item" key={item.label}>
              {item.dividerBefore ? <div aria-hidden="true" className="sidebar-nav-divider" /> : null}

              {item.kind === "action" ? (
                <button
                  className="sidebar-link"
                  disabled={item.isLoading}
                  onClick={item.onClick}
                  title={isCollapsed ? item.label : undefined}
                  type="button"
                >
                  <span className="sidebar-link-main">
                    <ItemIcon aria-hidden="true" className="sidebar-link-icon" size={18} strokeWidth={2} />
                    {!isCollapsed ? (
                      <span className="sidebar-link-label">
                        {item.isLoading ? "Opening DevTools..." : item.label}
                      </span>
                    ) : null}
                  </span>
                </button>
              ) : item.isDisabled ? (
                <span
                  aria-disabled="true"
                  className="sidebar-link sidebar-link-disabled"
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="sidebar-link-main">
                    <ItemIcon aria-hidden="true" className="sidebar-link-icon" size={18} strokeWidth={2} />
                    {!isCollapsed ? <span className="sidebar-link-label">{item.label}</span> : null}
                  </span>
                  {!isCollapsed ? <span className="sidebar-later-badge">Later</span> : null}
                </span>
              ) : (
                <NavLink
                  className={({ isActive }) =>
                    isActive ? "sidebar-link sidebar-link-active" : "sidebar-link"
                  }
                  end={item.end}
                  onClick={(event) => handleNavLinkClick(event, resolveSidebarItemTo(item))}
                  title={isCollapsed ? item.label : undefined}
                  to={resolveSidebarItemTo(item)}
                >
                  <span className="sidebar-link-main">
                    <ItemIcon aria-hidden="true" className="sidebar-link-icon" size={18} strokeWidth={2} />
                    {!isCollapsed ? <span className="sidebar-link-label">{item.label}</span> : null}
                  </span>
                  {badgeCount > 0 ? (
                    <span aria-hidden="true" className="sidebar-inbox-badge">
                      {badgeCount}
                    </span>
                  ) : null}
                </NavLink>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-footer">
        {!isCollapsed ? (
          <div className="sidebar-user-card">
            <div className="sidebar-user-meta">
              <p className="sidebar-user-name">{displayName}</p>
              {user ? (
                <Badge className="sidebar-user-role-badge" variant={getTeamUserRoleBadgeVariant(user.role)}>
                  {formatTeamUserRoleLabel(user.role)}
                </Badge>
              ) : null}
            </div>
          </div>
        ) : null}

        <button
          className="sidebar-sign-out"
          disabled={isAuthActionLoading}
          onClick={() => void logout()}
          title={isCollapsed ? "Sign out" : undefined}
          type="button"
        >
          <LogOut aria-hidden="true" size={16} strokeWidth={2} />
          {!isCollapsed ? <span>{isAuthActionLoading ? "Signing out..." : "Sign out"}</span> : null}
        </button>

        <button
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="sidebar-collapse-button"
          onClick={toggleCollapsed}
          type="button"
        >
          {isCollapsed ? (
            <ChevronsRight aria-hidden="true" size={16} strokeWidth={2} />
          ) : (
            <ChevronsLeft aria-hidden="true" size={16} strokeWidth={2} />
          )}
        </button>
      </div>
    </aside>
  );
}
