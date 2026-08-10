'use client';

import { useContext } from 'react';

import { ExplicitContentPreferenceContext } from '../context/ExplicitContentPreferenceContext';

export function useExplicitContentPreference() {
  const context = useContext(ExplicitContentPreferenceContext);

  if (!context) {
    throw new Error(
      'useExplicitContentPreference must be used within ExplicitContentPreferenceProvider.',
    );
  }

  return context;
}
