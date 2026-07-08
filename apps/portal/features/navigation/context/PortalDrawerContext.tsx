'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface PortalDrawerContextValue {
  close: () => void;
  isOpen: boolean;
  open: () => void;
}

const PortalDrawerContext = createContext<PortalDrawerContextValue | null>(null);

export function PortalDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ close, isOpen, open }), [close, isOpen, open]);

  return <PortalDrawerContext.Provider value={value}>{children}</PortalDrawerContext.Provider>;
}

export function usePortalDrawer(): PortalDrawerContextValue {
  const context = useContext(PortalDrawerContext);

  if (!context) {
    throw new Error('usePortalDrawer must be used within PortalDrawerProvider');
  }

  return context;
}
