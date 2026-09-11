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

const PORTAL_MAINTENANCE_REFRESH_INTERVAL_MS = 20_000;

export type PortalMaintenanceLoadStatus = 'loading' | 'ready' | 'error';

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

  const refresh = useCallback(async () => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    const request = portalMaintenanceService
      .loadState()
      .then((next) => {
        setState({
          enabled: next.enabled === true,
          heading: next.heading || PORTAL_MAINTENANCE_DEFAULT_HEADING,
          message: next.message || PORTAL_MAINTENANCE_DEFAULT_MESSAGE,
          maintenanceTestAccessGranted: next.maintenanceTestAccessGranted === true,
        });
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
        setIsRefreshing(false);
      });

    inFlightRef.current = request;
    setIsRefreshing(true);
    return request;
  }, []);

  useEffect(() => {
    void refresh();

    const refreshOnFocus = () => {
      void refresh();
    };
    const refreshOnVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnVisibility);
    const intervalId = window.setInterval(() => {
      void refresh();
    }, PORTAL_MAINTENANCE_REFRESH_INTERVAL_MS);

    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisibility);
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  // Re-resolve tester bypass when the signed-in identity changes (login/logout).
  useEffect(() => {
    void refresh();
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
