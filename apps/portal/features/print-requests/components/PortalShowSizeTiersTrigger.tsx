'use client';

import { useState, type ReactNode } from 'react';
import { Expand, TableProperties } from 'lucide-react';

import { PortalShowSizeTiersModal } from './PortalShowSizeTiersModal';

type PortalShowSizeTiersTriggerProps = {
  children: ReactNode;
  className?: string;
  onOpen?: () => void;
  /** When true, appends a small expand icon (pill-style CTAs). */
  showExpandIcon?: boolean;
  title?: string;
};

/** Opens the shared size-tiers rate table modal. */
export function PortalShowSizeTiersTrigger({
  children,
  className,
  onOpen,
  showExpandIcon = false,
  title,
}: PortalShowSizeTiersTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        aria-haspopup="dialog"
        aria-label="Show Prices"
        className={className}
        onClick={() => {
          onOpen?.();
          setIsOpen(true);
        }}
        title={title}
        type="button"
      >
        {children}
        {showExpandIcon ? <Expand aria-hidden size={14} strokeWidth={2.25} /> : null}
      </button>
      <PortalShowSizeTiersModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export function PortalShowSizeTiersIcon({ size = 18 }: { size?: number }) {
  return <TableProperties aria-hidden size={size} strokeWidth={1.75} />;
}
