import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User as FirebaseUser } from "firebase/auth";

import type { User } from "../../users/types/user.types";
import { studioGeneratedCardOverrideService } from "../../designs/services/studioGeneratedCardOverrideService";
import { clearStudioTaxonomyCaches } from "../../designs/services/taxonomyCacheControl";
import { authService } from "../services/authService";
import { authSessionService } from "../services/authSessionService";
import { AuthContext } from "./AuthContext";
import type { AuthBootstrapStatus, AuthContextValue, AuthState, LoginCredentials } from "../types/auth.types";

const initialAuthState: AuthState = {
  firebaseUser: null,
  user: null,
  bootstrapStatus: "initializing",
  isInitialBootstrap: true,
  isAuthActionLoading: false,
  isAuthenticated: false,
  error: null,
};

let taxonomyCacheAuthScope: string | null | undefined;

interface AuthProviderProps {
  children: ReactNode;
}

function completeInitialBootstrap(state: AuthState): AuthState {
  return {
    ...state,
    isInitialBootstrap: false,
  };
}

function getAuthenticatedState(firebaseUser: FirebaseUser, user: User): AuthState {
  if (!user.isActive) {
    return completeInitialBootstrap({
      firebaseUser,
      user,
      bootstrapStatus: "inactive",
      isInitialBootstrap: true,
      isAuthActionLoading: false,
      isAuthenticated: false,
      error: "This account is inactive. Contact an administrator.",
    });
  }

  return completeInitialBootstrap({
    firebaseUser,
    user,
    bootstrapStatus: "ready",
    isInitialBootstrap: true,
    isAuthActionLoading: false,
    isAuthenticated: true,
    error: null,
  });
}

function getProfileErrorState(firebaseUser: FirebaseUser, message: string): AuthState {
  const bootstrapStatus: AuthBootstrapStatus = message.includes("No Fresh Prints user profile")
    ? "missing-profile"
    : "error";

  return completeInitialBootstrap({
    firebaseUser,
    user: null,
    bootstrapStatus,
    isInitialBootstrap: true,
    isAuthActionLoading: false,
    isAuthenticated: false,
    error: message,
  });
}

function getLoadingProfileState(currentState: AuthState, firebaseUser: FirebaseUser): AuthState {
  const hasMatchingProfile = currentState.user?.id === firebaseUser.uid;

  return {
    ...currentState,
    firebaseUser,
    user: hasMatchingProfile ? currentState.user : null,
    bootstrapStatus: "loading-profile",
    isAuthActionLoading: false,
    isAuthenticated: false,
    error: null,
  };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);

  useEffect(() => {
    let isCurrentSubscription = true;
    let unsubscribe = () => {};

    void authService.configurePersistence().then(() => {
      if (!isCurrentSubscription) {
        return;
      }

      unsubscribe = authService.subscribeToAuthState((firebaseUser) => {
        if (!isCurrentSubscription) {
          return;
        }

        const nextAuthScope = firebaseUser?.uid ?? null;
        if (taxonomyCacheAuthScope !== nextAuthScope) {
          clearStudioTaxonomyCaches();
          studioGeneratedCardOverrideService.setSessionScope(nextAuthScope);
          taxonomyCacheAuthScope = nextAuthScope;
        }

        if (!firebaseUser) {
          authSessionService.clearSession();
          setAuthState((currentState) =>
            completeInitialBootstrap({
              firebaseUser: null,
              user: null,
              bootstrapStatus: "unauthenticated",
              isInitialBootstrap: currentState.isInitialBootstrap,
              isAuthActionLoading: false,
              isAuthenticated: false,
              error: null,
            }),
          );
          return;
        }

        const cachedProfile = authSessionService.getCachedProfile(firebaseUser.uid);

        if (cachedProfile) {
          setAuthState(getAuthenticatedState(firebaseUser, cachedProfile));
          return;
        }

        setAuthState((currentState) => getLoadingProfileState(currentState, firebaseUser));

        void authSessionService
          .loadUserProfile(firebaseUser.uid)
          .then((user) => {
            if (!isCurrentSubscription) {
              return;
            }

            setAuthState(getAuthenticatedState(firebaseUser, user));
          })
          .catch((error: unknown) => {
            if (!isCurrentSubscription) {
              return;
            }

            const message =
              error instanceof Error
                ? error.message
                : "Unable to load your user profile. Contact an administrator.";

            setAuthState(getProfileErrorState(firebaseUser, message));
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
      await authService.login(credentials);
    } catch (error) {
      setAuthState((currentState) => ({
        ...currentState,
        bootstrapStatus:
          currentState.firebaseUser && currentState.user ? currentState.bootstrapStatus : "unauthenticated",
        error: error instanceof Error ? error.message : "Unable to sign in.",
        isAuthActionLoading: false,
      }));
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthState((currentState) => ({
      ...currentState,
      error: null,
      isAuthActionLoading: true,
    }));

    try {
      await authService.logout();
    } catch (error) {
      setAuthState((currentState) => ({
        ...currentState,
        error: error instanceof Error ? error.message : "Unable to sign out.",
        isAuthActionLoading: false,
      }));
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...authState,
      login,
      logout,
    }),
    [authState, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
