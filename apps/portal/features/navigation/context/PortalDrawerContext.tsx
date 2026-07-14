'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const portalSidebarCollapsedStorageKey = 'fresh-prints-portal-sidebar-collapsed';
const DESKTOP_NAV_MQ = '(min-width: 48rem)';

function getStoredSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(portalSidebarCollapsedStorageKey) === 'true';
  } catch {
    return false;
  }
}

function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia(DESKTOP_NAV_MQ).matches;
}

interface PortalDrawerContextValue {
  /** Mobile off-canvas drawer open. */
  closeDrawer: () => void;
  /** Desktop: collapse to icon rail. Mobile: close drawer. */
  closeNav: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  isCollapsed: boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  /** Desktop: expand sidebar. Mobile: open drawer. */
  openNav: () => void;
}

const PortalDrawerContext = createContext<PortalDrawerContextValue | null>(null);

export function PortalDrawerProvider({ children }: { children: ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => getStoredSidebarCollapsed());

  useEffect(() => {
    try {
      localStorage.setItem(portalSidebarCollapsedStorageKey, String(isCollapsed));
    } catch {
      // Ignore storage failures.
    }
  }, [isCollapsed]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const expandSidebar = useCallback(() => setIsCollapsed(false), []);
  const collapseSidebar = useCallback(() => setIsCollapsed(true), []);

  const openNav = useCallback(() => {
    if (isDesktopViewport()) {
      setIsCollapsed(false);
      return;
    }
    setIsDrawerOpen(true);
  }, []);

  const closeNav = useCallback(() => {
    if (isDesktopViewport()) {
      setIsCollapsed(true);
      return;
    }
    setIsDrawerOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      closeDrawer,
      closeNav,
      collapseSidebar,
      expandSidebar,
      isCollapsed,
      isDrawerOpen,
      openDrawer,
      openNav,
    }),
    [
      closeDrawer,
      closeNav,
      collapseSidebar,
      expandSidebar,
      isCollapsed,
      isDrawerOpen,
      openDrawer,
      openNav,
    ],
  );

  return <PortalDrawerContext.Provider value={value}>{children}</PortalDrawerContext.Provider>;
}

export function usePortalDrawer(): PortalDrawerContextValue {
  const context = useContext(PortalDrawerContext);

  if (!context) {
    throw new Error('usePortalDrawer must be used within PortalDrawerProvider');
  }

  return context;
}
