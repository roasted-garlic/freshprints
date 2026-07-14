import { Heart, ImageUp, Library } from 'lucide-react';

import type { PortalNavItemId } from '../constants/portalNavItems';

interface PortalNavIconProps {
  itemId: PortalNavItemId;
  size?: number;
}

export function PortalNavIcon({ itemId, size = 20 }: PortalNavIconProps) {
  if (itemId === 'upload') {
    return <ImageUp aria-hidden size={size} strokeWidth={1.75} />;
  }

  if (itemId === 'favorites') {
    return <Heart aria-hidden size={size} strokeWidth={1.75} />;
  }

  return <Library aria-hidden size={size} strokeWidth={1.75} />;
}
