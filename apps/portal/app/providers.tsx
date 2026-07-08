'use client';

import { usePathname } from 'next/navigation';

import { AuthProvider } from '../features/auth/context/AuthProvider';
import { PortalChrome } from '../features/theme/components/PortalChrome';
import { ThemeProvider } from '../features/theme/context/ThemeProvider';

function isAuthenticatedAppRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/catalog') ||
    pathname.startsWith('/requests')
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showFloatingThemeToggle = !isAuthenticatedAppRoute(pathname);

  return (
    <ThemeProvider>
      <AuthProvider>
        {showFloatingThemeToggle ? <PortalChrome /> : null}
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}
