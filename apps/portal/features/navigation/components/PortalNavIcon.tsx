import { ClipboardList, Images } from 'lucide-react';

import type { PortalNavItemId } from '../constants/portalNavItems';

interface PortalNavIconProps {
  itemId: PortalNavItemId;
  size?: number;
}

export function PortalNavIcon({ itemId, size = 20 }: PortalNavIconProps) {
  if (itemId === 'designs') {
    return <Images aria-hidden size={size} strokeWidth={1.75} />;
  }

  return <ClipboardList aria-hidden size={size} strokeWidth={1.75} />;
}
