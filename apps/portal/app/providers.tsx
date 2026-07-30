'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { setFirestoreUsageTraceContext } from '@fresh-prints/shared/utils/firestoreUsageTrace';

import { AuthProvider } from '../features/auth/context/AuthProvider';
import { PortalAnalyticsBoundary } from '../features/analytics/components/PortalAnalyticsBoundary';
import type { PortalAnalyticsConfig } from '../features/analytics/types/portalAnalytics.types';
import { FirebaseDebugPanelMount } from '../features/firebase-debug/components/FirebaseDebugPanelMount';
import { PortalChrome } from '../features/theme/components/PortalChrome';
import { ThemeProvider } from '../features/theme/context/ThemeProvider';

/** Routes that render PortalAppShell (sidebar theme toggle) — hide floating PortalChrome. */
function isAuthenticatedAppRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/catalog') ||
    pathname.startsWith('/share/design') ||
    pathname.startsWith('/help') ||
    pathname.startsWith('/favorites') ||
    pathname.startsWith('/requests') ||
    pathname.startsWith('/donate') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/custom-designs') ||
    pathname.startsWith('/custom-request')
  );
}

export function Providers({
  children,
  analyticsConfig,
}: {
  children: React.ReactNode;
  analyticsConfig: PortalAnalyticsConfig;
}) {
  const pathname = usePathname();
  const showFloatingThemeToggle = !isAuthenticatedAppRoute(pathname);

  useEffect(() => {
    if (pathname !== '/firebase-debug') {
      setFirestoreUsageTraceContext({ app: 'portal', route: pathname });
    }
  }, [pathname]);

  if (pathname === '/firebase-debug') {
    return (
      <>
        {children}
        <FirebaseDebugPanelMount />
      </>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        {showFloatingThemeToggle ? <PortalChrome /> : null}
        {children}
        <FirebaseDebugPanelMount />
        <PortalAnalyticsBoundary config={analyticsConfig} />
      </AuthProvider>
    </ThemeProvider>
  );
}
