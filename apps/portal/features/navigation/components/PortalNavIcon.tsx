import { CalendarDays, HeartHandshake, ImageUp, Library, Palette } from 'lucide-react';

import type { PortalNavItemId } from '../constants/portalNavItems';

interface PortalNavIconProps {
  itemId: PortalNavItemId;
  size?: number;
}

export function PortalNavIcon({ itemId, size = 20 }: PortalNavIconProps) {
  if (itemId === 'upload') {
    return <ImageUp aria-hidden size={size} strokeWidth={1.75} />;
  }

  if (itemId === 'customDesigns') {
    return <Palette aria-hidden size={size} strokeWidth={1.75} />;
  }

  if (itemId === 'showDesigns') {
    return <CalendarDays aria-hidden size={size} strokeWidth={1.75} />;
  }

  if (itemId === 'donate') {
    return (
      <HeartHandshake
        aria-hidden
        className="portal-sidebar-donate-icon"
        size={size}
        strokeWidth={1.75}
      />
    );
  }

  return <Library aria-hidden size={size} strokeWidth={1.75} />;
}
