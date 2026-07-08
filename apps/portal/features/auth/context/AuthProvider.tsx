'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';

import type { Customer } from '@fresh-prints/shared/types/customer/customer.types';
import type { UserProfile } from '@fresh-prints/shared/types/user/user.types';

import { PORTAL_APP_NAME } from '../../brand/portalBrand';
import { assertPortalFirebaseEnv } from '../../../lib/firebase/env';
import { getPortalAuth } from '../../../lib/firebase/client';
import { AuthContext } from './AuthContext';
import { portalAuthService } from '../services/authService';
import { customerProfileService } from '../services/customerProfileService';
import { registerCustomerService } from '../services/registerCustomerService';
import { userProfileService } from '../services/userProfileService';
import type {
  LoginCredentials,
  PortalAuthBootstrapStatus,
  PortalAuthContextValue,
  PortalAuthState,
  RegisterCredentials,
} from '../types/auth.types';

const initialAuthState: PortalAuthState = {
  firebaseUser: null,
  user: null,
  customer: null,
  bootstrapStatus: 'initializing',
  isInitialBootstrap: true,
  isAuthActionLoading: false,
  isAuthenticated: false,
  error: null,
};

interface AuthProviderProps {
  children: ReactNode;
}

function completeInitialBootstrap(state: PortalAuthState): PortalAuthState {
  return {
    ...state,
    isInitialBootstrap: false,
  };
}

function getReadyState(
  firebaseUser: FirebaseUser,
  user: UserProfile,
  customer: Customer,
): PortalAuthState {
  return completeInitialBootstrap({
    firebaseUser,
    user,
    customer,
    bootstrapStatus: 'ready',
    isInitialBootstrap: true,
    isAuthActionLoading: false,
    isAuthenticated: true,
    error: null,
  });
}

function getBlockedState(
  firebaseUser: FirebaseUser,
  bootstrapStatus: PortalAuthBootstrapStatus,
  message: string,
): PortalAuthState {
  return completeInitialBootstrap({
    firebaseUser,
    user: null,
    customer: null,
    bootstrapStatus,
    isInitialBootstrap: true,
    isAuthActionLoading: false,
    isAuthenticated: false,
    error: message,
  });
}

async function loadPortalSession(firebaseUser: FirebaseUser): Promise<PortalAuthState> {
  const user = await userProfileService.getUserProfile(firebaseUser.uid);

  if (!user.isActive) {
    return getBlockedState(firebaseUser, 'inactive', 'This account is inactive. Contact support.');
  }

  if (user.role !== 'customer') {
    return getBlockedState(
      firebaseUser,
      'staff-account',
      'This account is for Fresh Prints Studio staff. Use the desktop app to sign in.',
    );
  }

  const customer = await customerProfileService.getCustomerByUserId(firebaseUser.uid);

  if (!customer) {
    return getBlockedState(
      firebaseUser,
      'missing-customer',
      'Your portal customer profile is not set up yet. Complete registration or contact support.',
    );
  }

  return getReadyState(firebaseUser, user, customer);
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<PortalAuthState>(initialAuthState);
  const registrationInProgressRef = useRef(false);

  useEffect(() => {
    let isCurrentSubscription = true;
    let unsubscribe = () => {};

    try {
      assertPortalFirebaseEnv();
    } catch (error) {
      setAuthState(
        completeInitialBootstrap({
          ...initialAuthState,
          bootstrapStatus: 'error',
          error:
            error instanceof Error
              ? error.message
              : `Firebase is not configured for ${PORTAL_APP_NAME}.`,
        }),
      );
      return;
    }

    void portalAuthService.configurePersistence().then(() => {
      if (!isCurrentSubscription) {
        return;
      }

      unsubscribe = portalAuthService.subscribeToAuthState((firebaseUser) => {
        if (!isCurrentSubscription) {
          return;
        }

        if (!firebaseUser) {
          registrationInProgressRef.current = false;
          setAuthState((currentState) =>
            completeInitialBootstrap({
              firebaseUser: null,
              user: null,
              customer: null,
              bootstrapStatus: 'unauthenticated',
              isInitialBootstrap: currentState.isInitialBootstrap,
              isAuthActionLoading: false,
              isAuthenticated: false,
              error: null,
            }),
          );
          return;
        }

        if (registrationInProgressRef.current) {
          setAuthState((currentState) => ({
            ...currentState,
            firebaseUser,
            bootstrapStatus: 'loading-profile',
            isAuthActionLoading: true,
            isAuthenticated: false,
            error: null,
          }));
          return;
        }

        setAuthState((currentState) => ({
          ...currentState,
          firebaseUser,
          user: currentState.user?.id === firebaseUser.uid ? currentState.user : null,
          customer: currentState.customer?.userId === firebaseUser.uid ? currentState.customer : null,
          bootstrapStatus: 'loading-profile',
          isAuthActionLoading: false,
          isAuthenticated: false,
          error: null,
        }));

        void loadPortalSession(firebaseUser)
          .then((nextState) => {
            if (!isCurrentSubscription) {
              return;
            }

            setAuthState(nextState);
          })
          .catch((error: unknown) => {
            if (!isCurrentSubscription) {
              return;
            }

            const message =
              error instanceof Error
                ? error.message
                : 'Unable to load your portal profile. Contact support.';

            setAuthState(
              getBlockedState(
                firebaseUser,
                message.includes('No Fresh Prints user profile') ? 'missing-profile' : 'error',
                message,
              ),
            );
          });
      });
    });

    return () => {
      isCurrentSubscription = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setAuthState((currentState) => ({
      ...currentState,
      error: null,
      isAuthActionLoading: true,
    }));

    try {
      await portalAuthService.login(credentials);
    } catch (error) {
      setAuthState((currentState) => ({
        ...currentState,
        bootstrapStatus: 'unauthenticated',
        error: error instanceof Error ? error.message : 'Unable to sign in.',
        isAuthActionLoading: false,
      }));
    }
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    registrationInProgressRef.current = true;

    setAuthState((currentState) => ({
      ...currentState,
      error: null,
      isAuthActionLoading: true,
    }));

    try {
      await portalAuthService.register(credentials);
      await registerCustomerService.provisionCustomerProfile({
        displayName: credentials.displayName,
        username: credentials.username,
      });

      const firebaseUser = getPortalAuth().currentUser;

      if (!firebaseUser) {
        throw new Error('Registration succeeded but the signed-in user could not be loaded.');
      }

      const nextState = await loadPortalSession(firebaseUser);
      setAuthState(nextState);
    } catch (error) {
      if (getPortalAuth().currentUser) {
        try {
          await portalAuthService.logout();
        } catch {
          // Best-effort reset so the user can retry registration.
        }
      }

      setAuthState(
        completeInitialBootstrap({
          firebaseUser: null,
          user: null,
          customer: null,
          bootstrapStatus: 'unauthenticated',
          isInitialBootstrap: false,
          isAuthActionLoading: false,
          isAuthenticated: false,
          error: error instanceof Error ? error.message : 'Unable to complete registration.',
        }),
      );
    } finally {
      registrationInProgressRef.current = false;
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthState((currentState) => ({
      ...currentState,
      error: null,
      isAuthActionLoading: true,
    }));

    try {
      await portalAuthService.logout();
    } catch (error) {
      setAuthState((currentState) => ({
        ...currentState,
        error: error instanceof Error ? error.message : 'Unable to sign out.',
        isAuthActionLoading: false,
      }));
    }
  }, []);

  const refreshCustomer = useCallback(async () => {
    const firebaseUser = getPortalAuth().currentUser;

    if (!firebaseUser) {
      return;
    }

    try {
      const customer = await customerProfileService.getCustomerByUserId(firebaseUser.uid);

      if (!customer) {
        return;
      }

      setAuthState((currentState) =>
        currentState.firebaseUser?.uid === firebaseUser.uid && currentState.user
          ? {
              ...currentState,
              customer,
            }
          : currentState,
      );
    } catch {
      // Keep the last known profile if a background refresh fails.
    }
  }, []);

  const value = useMemo<PortalAuthContextValue>(
    () => ({
      ...authState,
      login,
      register,
      logout,
      refreshCustomer,
    }),
    [authState, login, logout, refreshCustomer, register],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
