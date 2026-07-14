'use client';

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
  const { isLiked, isTogglingDesignId, toggleFavorite } = useFavorites();
  const liked = isLiked(designId);
  const isBusy = isTogglingDesignId === designId;

  return (
    <button
      aria-label={liked ? `Remove ${designTitle} from favorites` : `Add ${designTitle} to favorites`}
      aria-pressed={liked}
      className={`catalog-favorite-button${liked ? ' is-liked' : ''}${className ? ` ${className}` : ''}`}
      disabled={isBusy}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggleFavorite(designId);
      }}
      type="button"
    >
      <HeartIcon filled={liked} size={15} />
    </button>
  );
}
