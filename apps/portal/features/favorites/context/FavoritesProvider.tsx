'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '../../auth/context/AuthContext';
import { favoriteService } from '../services/favoriteService';

interface FavoritesContextValue {
  error: string | null;
  favoriteIds: ReadonlySet<string>;
  favoriteCount: number;
  isLiked: (designId: string) => boolean;
  isLoading: boolean;
  isTogglingDesignId: string | null;
  toggleFavorite: (designId: string) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { customer, firebaseUser, isAuthenticated } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const favoriteIdsRef = useRef(favoriteIds);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTogglingDesignId, setIsTogglingDesignId] = useState<string | null>(null);

  useEffect(() => {
    favoriteIdsRef.current = favoriteIds;
  }, [favoriteIds]);

  useEffect(() => {
    let isCancelled = false;

    async function loadFavorites() {
      if (!isAuthenticated || !customer?.id) {
        setFavoriteIds(new Set());
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const favorites = await favoriteService.listFavorites(customer.id);

        if (!isCancelled) {
          setFavoriteIds(new Set(favorites.map((favorite) => favorite.designId)));
        }
      } catch (loadError) {
        if (!isCancelled) {
          setFavoriteIds(new Set());
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load favorites.',
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadFavorites();

    return () => {
      isCancelled = true;
    };
  }, [customer?.id, isAuthenticated]);

  const toggleFavorite = useCallback(
    async (designId: string) => {
      if (!customer?.id || !firebaseUser?.uid) {
        return;
      }

      const alreadyLiked = favoriteIdsRef.current.has(designId);
      setIsTogglingDesignId(designId);
      setError(null);

      setFavoriteIds((current) => {
        const next = new Set(current);
        if (alreadyLiked) {
          next.delete(designId);
        } else {
          next.add(designId);
        }
        return next;
      });

      try {
        if (alreadyLiked) {
          await favoriteService.removeFavorite(customer.id, designId);
        } else {
          await favoriteService.addFavorite({
            customerId: customer.id,
            createdBy: firebaseUser.uid,
            designId,
          });
        }
      } catch (toggleError) {
        setFavoriteIds((current) => {
          const next = new Set(current);
          if (alreadyLiked) {
            next.add(designId);
          } else {
            next.delete(designId);
          }
          return next;
        });
        setError(
          toggleError instanceof Error
            ? toggleError.message
            : 'Unable to update favorites.',
        );
      } finally {
        setIsTogglingDesignId(null);
      }
    },
    [customer?.id, firebaseUser?.uid],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      error,
      favoriteCount: favoriteIds.size,
      favoriteIds,
      isLiked: (designId: string) => favoriteIds.has(designId),
      isLoading,
      isTogglingDesignId,
      toggleFavorite,
    }),
    [error, favoriteIds, isLoading, isTogglingDesignId, toggleFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }

  return context;
}
