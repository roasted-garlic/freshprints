'use client';

import { usePathname } from 'next/navigation';

import { AuthProvider } from '../features/auth/context/AuthProvider';
import { PortalChrome } from '../features/theme/components/PortalChrome';
import { ThemeProvider } from '../features/theme/context/ThemeProvider';

function isAuthenticatedAppRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/catalog') ||
    pathname.startsWith('/favorites') ||
    pathname.startsWith('/requests') ||
    pathname.startsWith('/donate') ||
    pathname.startsWith('/account')
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
