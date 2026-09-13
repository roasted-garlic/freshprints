'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  PORTAL_MAINTENANCE_DEFAULT_HEADING,
  PORTAL_MAINTENANCE_DEFAULT_MESSAGE,
  type PortalMaintenancePublicState,
} from '@fresh-prints/shared/constants/portal/portalMaintenance.constants';

import { useAuth } from '../../auth/context/AuthContext';
import { portalMaintenanceService } from '../services/portalMaintenanceService';

export type PortalMaintenanceLoadStatus = 'loading' | 'ready' | 'error';

function samePublicState(
  current: PortalMaintenancePublicState,
  next: PortalMaintenancePublicState,
): boolean {
  return (
    current.enabled === next.enabled &&
    current.heading === next.heading &&
    current.message === next.message &&
    current.maintenanceTestAccessGranted === next.maintenanceTestAccessGranted
  );
}

interface PortalMaintenanceContextValue {
  enabled: boolean;
  heading: string;
  maintenanceTestAccessGranted: boolean;
  error: string | null;
  isRefreshing: boolean;
  message: string;
  refresh: () => Promise<void>;
  status: PortalMaintenanceLoadStatus;
}

const PortalMaintenanceContext = createContext<PortalMaintenanceContextValue | null>(null);

export function usePortalMaintenance(): PortalMaintenanceContextValue {
  const value = useContext(PortalMaintenanceContext);
  if (!value) {
    throw new Error('usePortalMaintenance must be used within PortalMaintenanceProvider.');
  }
  return value;
}

export function PortalMaintenanceProvider({ children }: { children: ReactNode }) {
  const { bootstrapStatus, firebaseUser } = useAuth();
  const [state, setState] = useState<PortalMaintenancePublicState>({
    enabled: false,
    heading: PORTAL_MAINTENANCE_DEFAULT_HEADING,
    message: PORTAL_MAINTENANCE_DEFAULT_MESSAGE,
    maintenanceTestAccessGranted: false,
  });
  const [status, setStatus] = useState<PortalMaintenanceLoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    const silent = options?.silent === true;
    const request = portalMaintenanceService
      .loadState()
      .then((next) => {
        const projected: PortalMaintenancePublicState = {
          enabled: next.enabled === true,
          heading: next.heading || PORTAL_MAINTENANCE_DEFAULT_HEADING,
          message: next.message || PORTAL_MAINTENANCE_DEFAULT_MESSAGE,
          maintenanceTestAccessGranted: next.maintenanceTestAccessGranted === true,
        };
        setState((current) => (samePublicState(current, projected) ? current : projected));
        setStatus('ready');
        setError(null);
      })
      .catch((loadError: unknown) => {
        setStatus('error');
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Portal maintenance status is temporarily unavailable.',
        );
      })
      .finally(() => {
        inFlightRef.current = null;
        if (!silent) {
          setIsRefreshing(false);
        }
      });

    inFlightRef.current = request;
    if (!silent) {
      setIsRefreshing(true);
    }
    return request;
  }, []);

  useEffect(() => {
    void refresh({ silent: true });

    const refreshOnFocus = () => {
      void refresh({ silent: true });
    };
    const refreshOnVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh({ silent: true });
      }
    };

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnVisibility);

    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisibility);
    };
  }, [refresh]);

  // Re-resolve tester bypass when the signed-in identity changes (login/logout).
  useEffect(() => {
    void refresh({ silent: true });
  }, [bootstrapStatus, firebaseUser?.uid, refresh]);

  const value = useMemo<PortalMaintenanceContextValue>(
    () => ({
      enabled: state.enabled,
      heading: state.heading,
      maintenanceTestAccessGranted: state.maintenanceTestAccessGranted,
      error,
      isRefreshing,
      message: state.message,
      refresh,
      status,
    }),
    [
      error,
      isRefreshing,
      refresh,
      state.enabled,
      state.heading,
      state.maintenanceTestAccessGranted,
      state.message,
      status,
    ],
  );

  return <PortalMaintenanceContext.Provider value={value}>{children}</PortalMaintenanceContext.Provider>;
}
