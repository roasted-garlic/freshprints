'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { explicitContentPreferenceService } from '../services/explicitContentPreferenceService';
import { ExplicitContentPreferenceContext } from './ExplicitContentPreferenceContext';
import type { ExplicitContentPreferenceContextValue } from '../types/explicitContentPreference.types';

interface ExplicitContentPreferenceProviderProps {
  children: ReactNode;
}

export function ExplicitContentPreferenceProvider({
  children,
}: ExplicitContentPreferenceProviderProps) {
  const [showExplicitContent, setShowExplicitContentState] = useState<boolean>(() =>
    typeof window === 'undefined'
      ? false
      : explicitContentPreferenceService.getStoredShowExplicitContent(),
  );

  useEffect(() => {
    explicitContentPreferenceService.storeShowExplicitContent(showExplicitContent);
  }, [showExplicitContent]);

  const value = useMemo<ExplicitContentPreferenceContextValue>(
    () => ({
      showExplicitContent,
      setShowExplicitContent: setShowExplicitContentState,
      toggleShowExplicitContent: () =>
        setShowExplicitContentState((current) => !current),
    }),
    [showExplicitContent],
  );

  return (
    <ExplicitContentPreferenceContext.Provider value={value}>
      {children}
    </ExplicitContentPreferenceContext.Provider>
  );
}
