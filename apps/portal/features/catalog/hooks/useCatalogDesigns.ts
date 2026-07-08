'use client';

import { useEffect, useState } from 'react';

import { catalogService } from '../services/catalogService';
import type {
  CatalogCategory,
  CatalogDesign,
} from '../types/catalog.types';
import {
  filterCatalogDesignsByCategory,
  filterCatalogDesignsBySearch,
  filterCatalogDesignsByTags,
} from '../utils/catalogSearch';

interface UseCatalogDesignsResult {
  designs: CatalogDesign[];
  isLoading: boolean;
  error: string | null;
}

export function useCatalogDesigns(): UseCatalogDesignsResult {
  const [designs, setDesigns] = useState<CatalogDesign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadDesigns() {
      setIsLoading(true);
      setError(null);

      try {
        const nextDesigns = await catalogService.listAllReadyDesigns();

        if (!isCancelled) {
          setDesigns(nextDesigns);
        }
      } catch (loadError) {
        if (!isCancelled) {
          const message =
            loadError instanceof Error ? loadError.message : 'Unable to load the catalog. Please try again.';
          setError(message);
          setDesigns([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDesigns();

    return () => {
      isCancelled = true;
    };
  }, []);

  return {
    designs,
    isLoading,
    error,
  };
}

export function useFilteredCatalogDesigns(options: {
  designs: CatalogDesign[];
  search: string;
  categoryId?: string;
  selectedTags: string[];
}): CatalogDesign[] {
  const { designs, search, categoryId, selectedTags } = options;

  return filterCatalogDesignsByTags(
    filterCatalogDesignsByCategory(filterCatalogDesignsBySearch(designs, search), categoryId),
    selectedTags,
  );
}

export function useCatalogCategoryOptions(
  categories: CatalogCategory[],
  designs: CatalogDesign[],
  selectedTags: string[],
  search: string,
): Array<{ value: string; label: string }> {
  const baseDesigns = filterCatalogDesignsByTags(
    filterCatalogDesignsBySearch(designs, search),
    selectedTags,
  );
  const categoryCounts = new Map<string, number>();

  for (const design of baseDesigns) {
    if (!design.categoryId) {
      continue;
    }

    categoryCounts.set(design.categoryId, (categoryCounts.get(design.categoryId) ?? 0) + 1);
  }

  return [
    { value: '', label: 'All categories' },
    ...categories
      .filter((category) => categoryCounts.has(category.id))
      .map((category) => ({
        value: category.id,
        label: category.name,
      })),
  ];
}
