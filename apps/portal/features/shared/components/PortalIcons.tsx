import type { ReactNode } from 'react';

interface PortalIconProps {
  size?: number;
}

function IconSvg({ children, size = 16 }: PortalIconProps & { children: ReactNode }) {
  return (
    <svg aria-hidden="true" height={size} viewBox="0 0 24 24" width={size}>
      {children}
    </svg>
  );
}

export function ArrowLeftIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M19 12H5M12 19l-7-7 7-7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function ChevronLeftIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M15 18l-6-6 6-6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function ChevronRightIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M9 18l6-6-6-6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function CalendarPlusIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M8 2v4M16 2v4M3 10h18M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M12 14v6M9 17h6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function CheckIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M20 6 9 17l-5-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function ClipboardListIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 12h6M9 16h6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function CopyIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M8 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2M6 10h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function ShareIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <circle cx="18" cy="5" fill="none" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="6" cy="12" fill="none" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="19" fill="none" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function FilterIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M4 6h16M7 12h10M10 18h4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function HeartIcon({ size, filled = false }: PortalIconProps & { filled?: boolean }) {
  if (filled) {
    return (
      <IconSvg size={size}>
        <path
          d="M19.5 12.572 12 20l-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572"
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </IconSvg>
    );
  }

  return (
    <IconSvg size={size}>
      <path
        d="M19.5 12.572 12 20l-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function ImagePlusIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M16 5h6M19 2v6M4 19h4l8-8 4 4V5H4v14z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

/** Lucide `image-up` — upload design / artwork affordance. */
export function ImageUpIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="m14 19.5 3-3 3 3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M17 22v-5.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle
        cx="9"
        cy="9"
        fill="none"
        r="2"
        stroke="currentColor"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function GlobeIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

/** Lucide `book-search` — Discover / search the catalog. */
export function BookSearchIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M12 22H6.5a1 1 0 0 1 0-5h4.501"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="m22 22-1.879-1.878"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle
        cx="18"
        cy="18"
        fill="none"
        r="3"
        stroke="currentColor"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

/** Lucide `folder-search` — browse / find in library. */
export function FolderSearchIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle
        cx="11.5"
        cy="12.5"
        fill="none"
        r="2.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="m13.3 14.3 1.7 1.7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function LibraryIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function LogInIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function LogOutIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function MinusIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path d="M5 12h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </IconSvg>
  );
}

export function PlayCircleIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <circle cx="12" cy="12" fill="none" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="M10 8.5v7l6-3.5-6-3.5z"
        fill="currentColor"
        stroke="none"
      />
    </IconSvg>
  );
}

export function PlusCircleIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <circle cx="12" cy="12" fill="none" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v8M8 12h8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </IconSvg>
  );
}

export function PlusIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </IconSvg>
  );
}

export function RefreshIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function SaveIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M17 21v-8H7v8M7 3v5h8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function SearchIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm8.1 2.1-4.2-4.2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function ShoppingBagIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M6 6h15l-1.5 9h-12z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M6 6 5 3H2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function TrashIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M4 7h16M9 7V5h6v2M10 11v6M14 11v6M6 7l1 12h10l1-12"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function UserIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx="12" cy="7" fill="none" r="4" stroke="currentColor" strokeWidth="2" />
    </IconSvg>
  );
}

export function UserPlusIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx="9" cy="7" fill="none" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M19 8v6M22 11h-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </IconSvg>
  );
}

export function CircleHelpIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <circle
        cx="12"
        cy="12"
        fill="none"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M12 17h.01"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </IconSvg>
  );
}

export function XIcon({ size }: PortalIconProps) {
  return (
    <IconSvg size={size}>
      <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </IconSvg>
  );
}

export function GoogleIcon({ size }: PortalIconProps) {
  return (
    <svg
      aria-hidden="true"
      height={size ?? 18}
      viewBox="0 0 24 24"
      width={size ?? 18}
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
