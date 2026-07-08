'use client';

import { createContext, useContext } from 'react';

import type { PortalAuthContextValue } from '../types/auth.types';

export const AuthContext = createContext<PortalAuthContextValue | null>(null);

export function useAuth(): PortalAuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
