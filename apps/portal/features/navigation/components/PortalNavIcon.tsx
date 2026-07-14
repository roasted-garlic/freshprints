import { ClipboardList, Library } from 'lucide-react';

import type { PortalNavItemId } from '../constants/portalNavItems';

interface PortalNavIconProps {
  itemId: PortalNavItemId;
  size?: number;
}

export function PortalNavIcon({ itemId, size = 20 }: PortalNavIconProps) {
  if (itemId === 'library') {
    return <Library aria-hidden size={size} strokeWidth={1.75} />;
  }

  return <ClipboardList aria-hidden size={size} strokeWidth={1.75} />;
}
