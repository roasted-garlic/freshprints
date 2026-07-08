import type { User as FirebaseUser } from "firebase/auth";

import type { User } from "../../users/types/user.types";

export type AuthBootstrapStatus =
  | "initializing"
  | "loading-profile"
  | "ready"
  | "unauthenticated"
  | "missing-profile"
  | "inactive"
  | "error";

export interface AuthState {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  bootstrapStatus: AuthBootstrapStatus;
  isInitialBootstrap: boolean;
  isAuthActionLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

export function shouldShowBootstrapScreen(
  bootstrapStatus: AuthBootstrapStatus,
  isInitialBootstrap: boolean,
): boolean {
  if (bootstrapStatus === "initializing") {
    return true;
  }

  if (bootstrapStatus === "loading-profile" && isInitialBootstrap) {
    return true;
  }

  return (
    bootstrapStatus === "missing-profile" ||
    bootstrapStatus === "inactive" ||
    bootstrapStatus === "error"
  );
}
