'use client';

export function PortalMaintenanceTestBanner() {
  return (
    <div aria-live="polite" className="portal-maintenance-test-banner" role="status">
      Maintenance mode is active. You have temporary testing access.
    </div>
  );
}
