'use client';

import { useRouter } from 'next/navigation';

import { useAuth } from '../../auth/context/AuthContext';
import { redirectToPortalLogin } from '../../auth/utils/requirePortalLogin';
import { HeartIcon } from '../../shared/components/PortalIcons';
import { useFavorites } from '../context/FavoritesProvider';

interface CatalogFavoriteButtonProps {
  className?: string;
  designId: string;
  designTitle: string;
}

export function CatalogFavoriteButton({
  className = '',
  designId,
  designTitle,
}: CatalogFavoriteButtonProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isLiked, isTogglingDesignId, toggleFavorite } = useFavorites();
  const liked = isLiked(designId);
  const isBusy = isTogglingDesignId === designId;

  return (
    <button
      aria-label={
        isAuthenticated
          ? liked
            ? `Remove ${designTitle} from favorites`
            : `Add ${designTitle} to favorites`
          : `Sign in to favorite ${designTitle}`
      }
      aria-pressed={isAuthenticated ? liked : undefined}
      className={`catalog-favorite-button${liked ? ' is-liked' : ''}${className ? ` ${className}` : ''}`}
      disabled={isBusy}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!isAuthenticated) {
          redirectToPortalLogin(router, `/catalog?designId=${encodeURIComponent(designId)}`);
          return;
        }
        void toggleFavorite(designId);
      }}
      type="button"
    >
      <HeartIcon filled={liked} size={15} />
    </button>
  );
}
