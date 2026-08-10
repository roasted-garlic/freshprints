'use client';

import { useEffect, useState } from 'react';

import { catalogService } from '../services/catalogService';
import type { CatalogDesign } from '../types/catalog.types';

interface UseCatalogReadyCompanionDesignsResult {
  companionDesigns: CatalogDesign[];
  error: string | null;
  isLoading: boolean;
}

/**
 * Ready-only companion lookup for a single design's details view — direct pairwise neighbors
 * only (never transitive/clique). Portal never reads the staff-only `companionLinks`
 * collection — a neighbor not yet approved to ready simply yields fewer/no results here,
 * never a staff-incomplete indicator.
 */
export function useCatalogReadyCompanionDesigns(
  companionDesignIds: string[] | undefined,
  excludeDesignId: string | undefined,
): UseCatalogReadyCompanionDesignsResult {
  const [companionDesigns, setCompanionDesigns] = useState<CatalogDesign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const neighborIdsKey = companionDesignIds?.join(',') ?? '';

  useEffect(() => {
    if (!companionDesignIds || companionDesignIds.length === 0) {
      setCompanionDesigns([]);
      setError(null);
      setIsLoading(false);
      return undefined;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    catalogService
      .listReadyCompanionDesignsByIds(companionDesignIds, excludeDesignId)
      .then((designs) => {
        if (!isCancelled) {
          setCompanionDesigns(designs);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setCompanionDesigns([]);
          setError('Matching designs could not be loaded.');
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- neighborIdsKey is the stable dep for companionDesignIds
  }, [neighborIdsKey, excludeDesignId]);

  return { companionDesigns, error, isLoading };
}
