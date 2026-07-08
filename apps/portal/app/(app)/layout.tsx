'use client';

import type { ReactNode } from 'react';

import { AuthGate } from '../../features/auth/components/AuthGate';
import { PortalAppShell } from '../../features/navigation/components/PortalAppShell';

export default function AuthenticatedAppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <PortalAppShell>{children}</PortalAppShell>
    </AuthGate>
  );
}
