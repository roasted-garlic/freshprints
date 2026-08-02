import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

import {
  getDangerOverflowMenuPanelClass,
  resolveDangerOverflowMenuPosition,
  transitionDangerOverflowMenu,
  type DangerOverflowMenuPosition,
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
  triggerRef?: MutableRefObject<HTMLButtonElement | null>;
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
  triggerRef: externalTriggerRef,
}: DangerOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<DangerOverflowMenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const visibleItems = items.filter(Boolean);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent | PointerEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current &&
        !rootRef.current.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
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

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    setPosition(
      resolveDangerOverflowMenuPosition({
        menuHeight: menu.offsetHeight,
        menuWidth: menu.offsetWidth,
        preferredPlacement: placement,
        trigger: rect,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
      }),
    );
  }, [placement]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) {
      return;
    }
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

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
        ref={(element) => {
          triggerRef.current = element;
          if (externalTriggerRef) {
            externalTriggerRef.current = element;
          }
        }}
        type="button"
      >
        <MoreHorizontal aria-hidden="true" size={18} strokeWidth={2.2} />
      </button>
      {open ? createPortal(
        <div
          aria-label={ariaLabel}
          className={getDangerOverflowMenuPanelClass(position?.placement ?? placement)}
          id={menuId}
          ref={menuRef}
          role="menu"
          style={{
            left: position?.left ?? 0,
            top: position?.top ?? 0,
            visibility: position ? "visible" : "hidden",
          }}
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
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
