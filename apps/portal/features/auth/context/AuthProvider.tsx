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
  CompleteCustomerProfileInput,
  CompleteCustomerProfileOptions,
  LoginCredentials,
  PortalAuthBootstrapStatus,
  PortalAuthContextValue,
  PortalAuthState,
  RegisterCredentials,
} from '../types/auth.types';
import {
  CompleteProfileInProgressError,
  type CompleteProfileStage,
  reportCompleteProfileStage,
  userFacingMessageForCompleteProfileError,
  withCompleteProfileTimeout,
} from '../utils/completeProfileProvisioning';

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
  message: string | null,
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
    // Expected for brand-new Google users — complete-profile UI handles this (no error banner).
    return getBlockedState(firebaseUser, 'missing-customer', null);
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

        // Guest donate retired — clear leftover Anonymous Auth so Storage/public browse
        // is not evaluated under a uid with no users/{uid} doc.
        // Never sign out or clobber a registered customer if the session already flipped.
        if (firebaseUser.isAnonymous) {
          registrationInProgressRef.current = false;
          const anonymousUid = firebaseUser.uid;
          const liveUser = getPortalAuth().currentUser;
          if (liveUser && (!liveUser.isAnonymous || liveUser.uid !== anonymousUid)) {
            return;
          }
          void portalAuthService.clearAnonymousGuestSession();
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
          // Keep intentional sign-in/sign-up busy through profile bootstrap so overlays stay up.
          isAuthActionLoading: currentState.isAuthActionLoading,
          isAuthenticated: false,
          error: null,
        }));

        void loadPortalSession(firebaseUser)
          .then((nextState) => {
            if (!isCurrentSubscription) {
              return;
            }

            setAuthState((currentState) => {
              // Google first-login still needs complete-profile; keep busy until that page mounts.
              if (
                currentState.isAuthActionLoading &&
                (nextState.bootstrapStatus === 'missing-profile' ||
                  nextState.bootstrapStatus === 'missing-customer')
              ) {
                return {
                  ...nextState,
                  isAuthActionLoading: true,
                };
              }

              return nextState;
            });
          })
          .catch((error: unknown) => {
            if (!isCurrentSubscription) {
              return;
            }

            const message =
              error instanceof Error
                ? error.message
                : 'Unable to load your portal profile. Contact support.';
            const isMissingProfile = message.includes('No Fresh Prints user profile');

            setAuthState((currentState) => {
              const blocked = getBlockedState(
                firebaseUser,
                isMissingProfile ? 'missing-profile' : 'error',
                // Missing profile is the normal Google first-login path — no error banner.
                isMissingProfile ? null : message,
              );

              if (currentState.isAuthActionLoading && isMissingProfile) {
                return {
                  ...blocked,
                  isAuthActionLoading: true,
                };
              }

              return blocked;
            });
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

  const loginWithGoogle = useCallback(async () => {
    setAuthState((currentState) => ({
      ...currentState,
      error: null,
      isAuthActionLoading: true,
    }));

    try {
      await portalAuthService.loginWithGoogle();
      // Auth listener loads the session; keep the button busy until then.
    } catch (error) {
      setAuthState((currentState) => {
        const stillAuthenticated = currentState.isAuthenticated && Boolean(currentState.firebaseUser);

        return {
          ...currentState,
          // Cancelled / failed Google must never leave the auth screens stuck busy.
          firebaseUser: stillAuthenticated ? currentState.firebaseUser : null,
          user: stillAuthenticated ? currentState.user : null,
          customer: stillAuthenticated ? currentState.customer : null,
          bootstrapStatus: stillAuthenticated ? currentState.bootstrapStatus : 'unauthenticated',
          isAuthenticated: stillAuthenticated,
          error: error instanceof Error ? error.message : 'Unable to sign in with Google.',
          isAuthActionLoading: false,
        };
      });
    }
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthState((currentState) =>
      currentState.error
        ? {
            ...currentState,
            error: null,
          }
        : currentState,
    );
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    if (registrationInProgressRef.current) {
      setAuthState((currentState) => ({
        ...currentState,
        error: new CompleteProfileInProgressError().message,
        isAuthActionLoading: false,
      }));
      return;
    }

    registrationInProgressRef.current = true;
    let lastStage: CompleteProfileStage = 'submission_started';

    setAuthState((currentState) => ({
      ...currentState,
      error: null,
      isAuthActionLoading: true,
    }));

    try {
      await withCompleteProfileTimeout(
        (async () => {
          reportCompleteProfileStage('submission_started', 'email_register');
          lastStage = 'submission_started';

          await portalAuthService.register(credentials);

          const firebaseUser = getPortalAuth().currentUser;
          if (!firebaseUser || firebaseUser.isAnonymous) {
            throw new Error('Registration succeeded but the signed-in user could not be loaded.');
          }

          lastStage = 'auth_user_confirmed';
          reportCompleteProfileStage('auth_user_confirmed', 'email_register');

          lastStage = 'id_token_started';
          reportCompleteProfileStage('id_token_started');
          try {
            await firebaseUser.getIdToken(true);
            lastStage = 'id_token_succeeded';
            reportCompleteProfileStage('id_token_succeeded');
          } catch {
            lastStage = 'id_token_failed';
            reportCompleteProfileStage('id_token_failed');
            throw new Error('Could not verify your sign-in session. Please try again.');
          }

          lastStage = 'callable_ref_created';
          reportCompleteProfileStage('callable_ref_created', 'registerCustomer');
          lastStage = 'callable_started';
          reportCompleteProfileStage('callable_started', 'registerCustomer');
          try {
            await registerCustomerService.provisionCustomerProfile({
              displayName: credentials.displayName,
              username: credentials.username,
              biddingAcknowledgmentAccepted: credentials.biddingAcknowledgmentAccepted,
              biddingAcknowledgmentVersion: credentials.biddingAcknowledgmentVersion,
            });
            lastStage = 'callable_succeeded';
            reportCompleteProfileStage('callable_succeeded', 'registerCustomer');
          } catch (error) {
            lastStage = 'callable_failed';
            reportCompleteProfileStage('callable_failed', 'registerCustomer');
            throw error;
          }

          const signedInUser = getPortalAuth().currentUser;
          if (!signedInUser) {
            throw new Error('Registration succeeded but the signed-in user could not be loaded.');
          }

          lastStage = 'session_reload_started';
          reportCompleteProfileStage('session_reload_started');
          try {
            const nextState = await loadPortalSession(signedInUser);
            lastStage = 'session_reload_succeeded';
            reportCompleteProfileStage('session_reload_succeeded');
            setAuthState(nextState);
            lastStage = 'completed';
            reportCompleteProfileStage('completed', 'email_register');
          } catch (error) {
            lastStage = 'session_reload_failed';
            reportCompleteProfileStage('session_reload_failed');
            throw error;
          }
        })(),
        () => lastStage,
      );
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
          error: userFacingMessageForCompleteProfileError(error),
        }),
      );
    } finally {
      registrationInProgressRef.current = false;
    }
  }, []);

  const completeCustomerProfile = useCallback(
    async (input: CompleteCustomerProfileInput, options?: CompleteCustomerProfileOptions) => {
      if (registrationInProgressRef.current) {
        const inProgress = new CompleteProfileInProgressError();
        setAuthState((currentState) => ({
          ...currentState,
          error: inProgress.message,
          isAuthActionLoading: false,
        }));
        throw inProgress;
      }

      registrationInProgressRef.current = true;
      let lastStage: CompleteProfileStage = 'submission_started';

      setAuthState((currentState) => ({
        ...currentState,
        error: null,
        isAuthActionLoading: true,
      }));

      try {
        await withCompleteProfileTimeout(
          (async () => {
            lastStage = 'submission_started';
            reportCompleteProfileStage('submission_started', 'complete_profile');
            options?.onProgress?.('Creating your customer account…');

            const firebaseUser = getPortalAuth().currentUser;
            if (!firebaseUser || firebaseUser.isAnonymous) {
              throw new Error('Sign-in is required to finish registration.');
            }

            lastStage = 'auth_user_confirmed';
            reportCompleteProfileStage('auth_user_confirmed');

            lastStage = 'id_token_started';
            reportCompleteProfileStage('id_token_started');
            options?.onProgress?.('Verifying your sign-in…');
            try {
              await firebaseUser.getIdToken(true);
              lastStage = 'id_token_succeeded';
              reportCompleteProfileStage('id_token_succeeded');
            } catch {
              lastStage = 'id_token_failed';
              reportCompleteProfileStage('id_token_failed');
              throw new Error(
                'Could not verify your sign-in session. Try again or use a different account.',
              );
            }

            lastStage = 'callable_ref_created';
            reportCompleteProfileStage('callable_ref_created', 'registerCustomer');
            options?.onProgress?.('Creating your account and reserving your username…');
            lastStage = 'callable_started';
            reportCompleteProfileStage('callable_started', 'registerCustomer');
            try {
              await registerCustomerService.provisionCustomerProfile({
                displayName: input.displayName,
                username: input.username,
                biddingAcknowledgmentAccepted: input.biddingAcknowledgmentAccepted,
                biddingAcknowledgmentVersion: input.biddingAcknowledgmentVersion,
              });
              lastStage = 'callable_succeeded';
              reportCompleteProfileStage('callable_succeeded', 'registerCustomer');
            } catch (error) {
              lastStage = 'callable_failed';
              reportCompleteProfileStage('callable_failed', 'registerCustomer');
              throw error;
            }

            const signedInUser = getPortalAuth().currentUser;
            if (!signedInUser) {
              throw new Error('Signed-in user could not be loaded after profile setup.');
            }

            lastStage = 'session_reload_started';
            reportCompleteProfileStage('session_reload_started');
            options?.onProgress?.('Loading your portal…');
            try {
              const nextState = await loadPortalSession(signedInUser);
              lastStage = 'session_reload_succeeded';
              reportCompleteProfileStage('session_reload_succeeded');
              setAuthState({
                ...nextState,
                isAuthActionLoading: nextState.isAuthenticated ? false : true,
              });
              lastStage = 'completed';
              reportCompleteProfileStage('completed', 'complete_profile');
            } catch (error) {
              lastStage = 'session_reload_failed';
              reportCompleteProfileStage('session_reload_failed');
              throw error;
            }
          })(),
          () => lastStage,
        );
      } catch (error) {
        setAuthState((currentState) => ({
          ...currentState,
          error: userFacingMessageForCompleteProfileError(error),
          isAuthActionLoading: false,
        }));
        throw error;
      } finally {
        registrationInProgressRef.current = false;
      }
    },
    [],
  );

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
      loginWithGoogle,
      register,
      completeCustomerProfile,
      clearAuthError,
      logout,
      refreshCustomer,
    }),
    [
      authState,
      clearAuthError,
      completeCustomerProfile,
      login,
      loginWithGoogle,
      logout,
      refreshCustomer,
      register,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
