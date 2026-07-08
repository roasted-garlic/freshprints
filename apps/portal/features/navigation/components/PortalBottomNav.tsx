'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { portalNavItems, resolveActivePortalNavItem, type PortalNavItem } from '../constants/portalNavItems';

function HomeIcon() {
  return (
    <svg aria-hidden="true" height="20" viewBox="0 0 24 24" width="20">
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function DesignsIcon() {
  return (
    <svg aria-hidden="true" height="20" viewBox="0 0 24 24" width="20">
      <rect
        fill="none"
        height="7"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.75"
        width="7"
        x="4"
        y="4"
      />
      <rect
        fill="none"
        height="7"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.75"
        width="7"
        x="13"
        y="4"
      />
      <rect
        fill="none"
        height="7"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.75"
        width="7"
        x="4"
        y="13"
      />
      <rect
        fill="none"
        height="7"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.75"
        width="7"
        x="13"
        y="13"
      />
    </svg>
  );
}

function RequestsIcon() {
  return (
    <svg aria-hidden="true" height="20" viewBox="0 0 24 24" width="20">
      <path
        d="M7 4h10a2 2 0 0 1 2 2v14l-4-2.5L11 20V6a2 2 0 0 0-2-2Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function NavIcon({ itemId }: { itemId: PortalNavItem['id'] }) {
  if (itemId === 'home') {
    return <HomeIcon />;
  }

  if (itemId === 'designs') {
    return <DesignsIcon />;
  }

  return <RequestsIcon />;
}

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
                <NavIcon itemId={item.id} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
