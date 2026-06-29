import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ChevronsLeft,
  ChevronsRight,
  Images,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  MessageSquare,
  Settings,
  Sparkles,
  FolderInput,
  Users,
  X,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

import { useAuth } from "../../features/auth/hooks/useAuth";
import { permissionService } from "../../features/permissions/services/permissionService";
import type { PermissionKey } from "../../features/permissions/types/permission.types";
import { useSidebarDrawer } from "../hooks/useSidebarDrawer";
import { AppLogo } from "./AppLogo";
import { Badge } from "./Badge";
import { formatTeamUserRoleLabel, getTeamUserRoleBadgeVariant } from "../../features/users/utils/teamUserRoleDisplay";

interface SidebarItem {
  icon: LucideIcon;
  label: string;
  to: string;
  end?: boolean;
  isDisabled?: boolean;
  dividerBefore?: boolean;
  permission?: PermissionKey;
}

const sidebarItems: SidebarItem[] = [
  { icon: Images, label: "Design Library", to: "/designs", permission: "viewDesigns" },
  { icon: Sparkles, label: "AI Processing", to: "/ai-review", permission: "viewAiReview" },
  { icon: FolderInput, label: "Imports", to: "/imports", permission: "importDesigns" },
  {
    icon: ListOrdered,
    label: "Print Requests",
    to: "/print-requests",
    permission: "viewPrintRequests",
  },
  {
    icon: ListOrdered,
    label: "Show Queue",
    to: "/show-queue",
    permission: "manageQueues",
    dividerBefore: true,
    isDisabled: true,
  },
  {
    icon: MessageSquare,
    label: "Customer Requests",
    to: "/customer-requests",
    permission: "manageRequests",
    isDisabled: true,
  },
  { icon: Users, label: "Users", to: "/users", permission: "viewUsers", dividerBefore: true },
  { icon: Settings, label: "Settings", to: "/settings", permission: "manageSettings" },
  {
    icon: LayoutDashboard,
    label: "Dev Dashboard",
    to: "/dev-dashboard",
    permission: "accessDashboard",
  },
];

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
  const sidebarRef = useRef<HTMLElement>(null);
  const [isIndicatorVisible, setIsIndicatorVisible] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => getStoredSidebarCollapsed());
  const { isOpen: isDrawerOpen, close: closeDrawer } = useSidebarDrawer();

  useEffect(() => {
    closeDrawer();
  }, [location.pathname, closeDrawer]);

  const visibleSidebarItems = sidebarItems.filter(
    (item) => !item.permission || permissionService.hasPermission(user, item.permission),
  );

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
    (item: SidebarItem) => {
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

          return (
            <div className="sidebar-nav-item" key={item.label}>
              {item.dividerBefore ? <div aria-hidden="true" className="sidebar-nav-divider" /> : null}

              {item.isDisabled ? (
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
                  title={isCollapsed ? item.label : undefined}
                  to={resolveSidebarItemTo(item)}
                >
                  <span className="sidebar-link-main">
                    <ItemIcon aria-hidden="true" className="sidebar-link-icon" size={18} strokeWidth={2} />
                    {!isCollapsed ? <span className="sidebar-link-label">{item.label}</span> : null}
                  </span>
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
