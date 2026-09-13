'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { setFirestoreUsageTraceContext } from '@fresh-prints/shared/utils/firestoreUsageTrace';

import { AuthProvider } from '../features/auth/context/AuthProvider';
import { useAuth } from '../features/auth/context/AuthContext';
import { PortalAnalyticsBoundary } from '../features/analytics/components/PortalAnalyticsBoundary';
import { PortalAnalyticsShareTitleProvider } from '../features/analytics/context/PortalAnalyticsShareTitleContext';
import type { PortalAnalyticsConfig } from '../features/analytics/types/portalAnalytics.types';
import { ExplicitContentPreferenceProvider } from '../features/catalog/context/ExplicitContentPreferenceProvider';
import { FirebaseDebugPanelMount } from '../features/firebase-debug/components/FirebaseDebugPanelMount';
import { shouldShowFloatingThemeToggle } from '../features/navigation/utils/shouldShowFloatingThemeToggle';
import { PortalChrome } from '../features/theme/components/PortalChrome';
import { ThemeProvider } from '../features/theme/context/ThemeProvider';
import { PortalMaintenanceProvider } from '../features/maintenance/context/PortalMaintenanceContext';

export function Providers({
  children,
  analyticsConfig,
}: {
  children: React.ReactNode;
  analyticsConfig: PortalAnalyticsConfig;
}) {
  const pathname = usePathname();
  const showFloatingThemeToggle = shouldShowFloatingThemeToggle(pathname);

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
        <PortalMaintenanceProvider>
          <PortalRouteProviders>
            <PortalAnalyticsShareTitleProvider>
              {showFloatingThemeToggle ? <PortalChrome /> : null}
              {children}
              <FirebaseDebugPanelMount />
              <PortalAnalyticsBoundary config={analyticsConfig} />
            </PortalAnalyticsShareTitleProvider>
          </PortalRouteProviders>
        </PortalMaintenanceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

/** Customer preference state is intentionally absent from the isolated admin route. */
function PortalRouteProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { bootstrapStatus } = useAuth();
  if (pathname.startsWith('/admin') || bootstrapStatus === 'portal-admin') {
    return <>{children}</>;
  }
  return <ExplicitContentPreferenceProvider>{children}</ExplicitContentPreferenceProvider>;
}
