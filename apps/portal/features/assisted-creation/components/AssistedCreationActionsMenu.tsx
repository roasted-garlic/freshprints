'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

interface AssistedCreationActionsMenuProps {
  canUpdate: boolean;
  canCancel: boolean;
  disabled?: boolean;
  onUpdate: () => void;
  onCancel: () => void;
}

export function AssistedCreationActionsMenu({
  canUpdate,
  canCancel,
  disabled = false,
  onUpdate,
  onCancel,
}: AssistedCreationActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent | PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!canUpdate && !canCancel) {
    return null;
  }

  return (
    <div className="assisted-creation-actions-menu" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Request actions"
        className="assisted-creation-actions-menu-trigger"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <MoreHorizontal aria-hidden="true" size={18} strokeWidth={2.2} />
      </button>
      {open ? (
        <div
          aria-label="Request actions"
          className="assisted-creation-actions-menu-panel"
          id={menuId}
          role="menu"
        >
          {canUpdate ? (
            <button
              className="assisted-creation-actions-menu-item"
              disabled={disabled}
              onClick={() => {
                setOpen(false);
                onUpdate();
              }}
              role="menuitem"
              type="button"
            >
              Update request
            </button>
          ) : null}
          {canCancel ? (
            <button
              className="assisted-creation-actions-menu-item assisted-creation-actions-menu-item-danger"
              disabled={disabled}
              onClick={() => {
                setOpen(false);
                onCancel();
              }}
              role="menuitem"
              type="button"
            >
              Cancel request
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
