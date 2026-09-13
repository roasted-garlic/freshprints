'use client';

import type { ReactNode } from 'react';

import { PortalAdminAuthGate } from '../../features/admin-show-queue/components/PortalAdminAuthGate';
import { PortalAdminShell } from '../../features/admin-show-queue/components/PortalAdminShell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <PortalAdminAuthGate>
      <PortalAdminShell>{children}</PortalAdminShell>
    </PortalAdminAuthGate>
  );
}
