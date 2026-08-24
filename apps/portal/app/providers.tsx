'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { setFirestoreUsageTraceContext } from '@fresh-prints/shared/utils/firestoreUsageTrace';

import { AuthProvider } from '../features/auth/context/AuthProvider';
import { PortalAnalyticsBoundary } from '../features/analytics/components/PortalAnalyticsBoundary';
import { PortalAnalyticsShareTitleProvider } from '../features/analytics/context/PortalAnalyticsShareTitleContext';
import type { PortalAnalyticsConfig } from '../features/analytics/types/portalAnalytics.types';
import { ExplicitContentPreferenceProvider } from '../features/catalog/context/ExplicitContentPreferenceProvider';
import { FirebaseDebugPanelMount } from '../features/firebase-debug/components/FirebaseDebugPanelMount';
import { isPortalAppShellRoute } from '../features/navigation/utils/isPortalAppShellRoute';
import { PortalChrome } from '../features/theme/components/PortalChrome';
import { ThemeProvider } from '../features/theme/context/ThemeProvider';

export function Providers({
  children,
  analyticsConfig,
}: {
  children: React.ReactNode;
  analyticsConfig: PortalAnalyticsConfig;
}) {
  const pathname = usePathname();
  const showFloatingThemeToggle = !isPortalAppShellRoute(pathname);

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
      <ExplicitContentPreferenceProvider>
        <AuthProvider>
          <PortalAnalyticsShareTitleProvider>
            {showFloatingThemeToggle ? <PortalChrome /> : null}
            {children}
            <FirebaseDebugPanelMount />
            <PortalAnalyticsBoundary config={analyticsConfig} />
          </PortalAnalyticsShareTitleProvider>
        </AuthProvider>
      </ExplicitContentPreferenceProvider>
    </ThemeProvider>
  );
}
