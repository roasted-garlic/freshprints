'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface PortalAdminShowPickerContextValue {
  isShowPickerOpen: boolean;
  openShowPicker: () => void;
  closeShowPicker: () => void;
}

const PortalAdminShowPickerContext = createContext<PortalAdminShowPickerContextValue | null>(null);

export function PortalAdminShowPickerProvider({ children }: { children: ReactNode }) {
  const [isShowPickerOpen, setIsShowPickerOpen] = useState(false);

  const openShowPicker = useCallback(() => setIsShowPickerOpen(true), []);
  const closeShowPicker = useCallback(() => setIsShowPickerOpen(false), []);

  const value = useMemo(
    () => ({
      isShowPickerOpen,
      openShowPicker,
      closeShowPicker,
    }),
    [closeShowPicker, isShowPickerOpen, openShowPicker],
  );

  return (
    <PortalAdminShowPickerContext.Provider value={value}>{children}</PortalAdminShowPickerContext.Provider>
  );
}

export function usePortalAdminShowPicker(): PortalAdminShowPickerContextValue {
  const value = useContext(PortalAdminShowPickerContext);
  if (!value) {
    throw new Error('usePortalAdminShowPicker must be used within PortalAdminShowPickerProvider');
  }
  return value;
}
