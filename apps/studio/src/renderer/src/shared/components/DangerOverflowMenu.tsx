import { useEffect, useId, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

import {
  getDangerOverflowMenuPanelClass,
  transitionDangerOverflowMenu,
  type DangerOverflowMenuPlacement,
} from "./dangerOverflowMenuBehavior";

export interface DangerOverflowMenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  /** Defaults to true for this menu (destructive actions). */
  danger?: boolean;
  disabled?: boolean;
}

interface DangerOverflowMenuProps {
  ariaLabel?: string;
  disabled?: boolean;
  items: DangerOverflowMenuItem[];
  placement?: DangerOverflowMenuPlacement;
}

/**
 * Extra click barrier for destructive actions: open ⋯ menu, then choose an action,
 * then the feature's confirmation dialog still runs.
 */
export function DangerOverflowMenu({
  ariaLabel = "More actions",
  disabled = false,
  items,
  placement = "bottom",
}: DangerOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const visibleItems = items.filter(Boolean);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent | PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(transitionDangerOverflowMenu(true, "outside").open);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        const transition = transitionDangerOverflowMenu(true, "escape");
        setOpen(transition.open);
        if (transition.restoreTriggerFocus) {
          triggerRef.current?.focus();
        }
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    menuRef.current
      ?.querySelector<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)')
      ?.focus();
  }, [open]);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className="danger-overflow-menu" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        className="danger-overflow-menu-trigger"
        disabled={disabled}
        onClick={() => {
          setOpen((current) => transitionDangerOverflowMenu(current, "trigger", disabled).open);
        }}
        ref={triggerRef}
        type="button"
      >
        <MoreHorizontal aria-hidden="true" size={18} strokeWidth={2.2} />
      </button>
      {open ? (
        <div
          aria-label={ariaLabel}
          className={getDangerOverflowMenuPanelClass(placement)}
          id={menuId}
          ref={menuRef}
          role="menu"
        >
          {visibleItems.map((item) => {
            const isDanger = item.danger !== false;
            return (
              <button
                className={
                  isDanger
                    ? "danger-overflow-menu-item danger-overflow-menu-item-danger"
                    : "danger-overflow-menu-item"
                }
                disabled={disabled || item.disabled}
                key={item.id}
                onClick={() => {
                  setOpen(transitionDangerOverflowMenu(true, "select").open);
                  item.onSelect();
                }}
                role="menuitem"
                type="button"
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
