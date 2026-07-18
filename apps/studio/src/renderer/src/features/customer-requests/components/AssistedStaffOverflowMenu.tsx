import { useEffect, useId, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

interface AssistedStaffOverflowMenuProps {
  canCancel: boolean;
  canReject: boolean;
  canRestore: boolean;
  disabled?: boolean;
  onCancel: () => void;
  onReject: () => void;
  onRestore: () => void;
}

export function AssistedStaffOverflowMenu({
  canCancel,
  canReject,
  canRestore,
  disabled = false,
  onCancel,
  onReject,
  onRestore,
}: AssistedStaffOverflowMenuProps) {
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
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!canReject && !canCancel && !canRestore) {
    return null;
  }

  return (
    <div className="customer-requests-assisted-actions-menu" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Request actions"
        className="customer-requests-assisted-actions-menu-trigger"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <MoreHorizontal aria-hidden="true" size={18} strokeWidth={2.2} />
      </button>
      {open ? (
        <div
          aria-label="Request actions"
          className="customer-requests-assisted-actions-menu-panel"
          id={menuId}
          role="menu"
        >
          {canReject ? (
            <button
              className="customer-requests-assisted-actions-menu-item customer-requests-assisted-actions-menu-item-danger"
              disabled={disabled}
              onClick={() => {
                setOpen(false);
                onReject();
              }}
              role="menuitem"
              type="button"
            >
              Reject
            </button>
          ) : null}
          {canCancel ? (
            <button
              className="customer-requests-assisted-actions-menu-item"
              disabled={disabled}
              onClick={() => {
                setOpen(false);
                onCancel();
              }}
              role="menuitem"
              type="button"
            >
              Cancel
            </button>
          ) : null}
          {canRestore ? (
            <button
              className="customer-requests-assisted-actions-menu-item"
              disabled={disabled}
              onClick={() => {
                setOpen(false);
                onRestore();
              }}
              role="menuitem"
              type="button"
            >
              Restore…
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
