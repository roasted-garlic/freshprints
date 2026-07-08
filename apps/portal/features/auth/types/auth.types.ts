import type { User as FirebaseUser } from 'firebase/auth';

import type { Customer } from '@fresh-prints/shared/types/customer/customer.types';
import type { UserProfile } from '@fresh-prints/shared/types/user/user.types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  displayName: string;
  username: string;
}

export type PortalAuthBootstrapStatus =
  | 'initializing'
  | 'unauthenticated'
  | 'loading-profile'
  | 'ready'
  | 'inactive'
  | 'staff-account'
  | 'missing-customer'
  | 'missing-profile'
  | 'error';

export interface PortalAuthState {
  firebaseUser: FirebaseUser | null;
  user: UserProfile | null;
  customer: Customer | null;
  bootstrapStatus: PortalAuthBootstrapStatus;
  isInitialBootstrap: boolean;
  isAuthActionLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface PortalAuthContextValue extends PortalAuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshCustomer: () => Promise<void>;
}
