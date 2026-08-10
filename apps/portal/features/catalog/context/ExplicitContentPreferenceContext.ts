'use client';

import { createContext } from 'react';

import type { ExplicitContentPreferenceContextValue } from '../types/explicitContentPreference.types';

export const ExplicitContentPreferenceContext =
  createContext<ExplicitContentPreferenceContextValue | null>(null);
