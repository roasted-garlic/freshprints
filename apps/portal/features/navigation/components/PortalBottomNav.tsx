'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { portalNavItems, resolveActivePortalNavItem } from '../constants/portalNavItems';
import { PortalNavIcon } from './PortalNavIcon';

export function PortalBottomNav() {
  const pathname = usePathname();
  const activeItemId = resolveActivePortalNavItem(pathname);

  return (
    <nav aria-label="Portal navigation" className="portal-bottom-nav">
      <ul className="portal-bottom-nav-list">
        {portalNavItems.map((item) => {
          const isActive = item.id === activeItemId;

          return (
            <li key={item.id}>
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={`portal-bottom-nav-link${isActive ? ' portal-bottom-nav-link-active' : ''}`}
                href={item.href}
              >
                <PortalNavIcon itemId={item.id} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
