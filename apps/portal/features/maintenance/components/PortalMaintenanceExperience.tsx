'use client';

import { useEffect, useRef } from 'react';

import { usePortalMaintenance } from '../context/PortalMaintenanceContext';

export function PortalMaintenanceExperience() {
  const { enabled, heading, isRefreshing, message, refresh, status } = usePortalMaintenance();
  const isUnavailable = status === 'error';
  const experienceRef = useRef<HTMLElement>(null);

  useEffect(() => {
    experienceRef.current?.focus();
  }, []);

  return (
    <main
      aria-describedby="portal-maintenance-copy"
      aria-labelledby="portal-maintenance-title"
      className="portal-maintenance-experience"
      ref={experienceRef}
      role="status"
      tabIndex={-1}
    >
      <div className="portal-maintenance-card">
        <p className="portal-eyebrow">Fresh Prints Portal</p>
        <h1 id="portal-maintenance-title">
          {status === 'loading'
            ? 'We’re checking things out…'
            : enabled
              ? heading
              : 'We’ll be back shortly.'}
        </h1>
        <p className="portal-lead" id="portal-maintenance-copy">
          {status === 'loading'
            ? 'Please wait while we check the Portal.'
              : isUnavailable
                ? 'We’re having a little trouble checking the Portal right now. Please try again in a moment.'
                : enabled
                ? message
                : 'The Portal is temporarily unavailable. Please try again in a moment.'}
        </p>
        <button
          className="portal-button portal-button-secondary"
          disabled={isRefreshing}
          onClick={() => {
            void refresh();
          }}
          type="button"
        >
          {isRefreshing ? 'Checking…' : 'Check again'}
        </button>
      </div>
    </main>
  );
}
