import type { ReactNode } from "react";

interface UserManagementModalProps {
  ariaLabelledBy: string;
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  size?: "md" | "lg" | "xl";
}

export function UserManagementModal({
  ariaLabelledBy,
  children,
  isOpen,
  onClose,
  size = "md",
}: UserManagementModalProps) {
  if (!isOpen) {
    return null;
  }

  const shellClassName =
    size === "xl"
      ? "user-management-modal-shell user-management-modal-shell-xl"
      : size === "lg"
        ? "user-management-modal-shell user-management-modal-shell-lg"
        : "user-management-modal-shell";
  const panelClassName =
    size === "xl"
      ? "modal-panel modal-panel-lg user-management-modal user-management-modal-lg"
      : size === "lg"
        ? "modal-panel modal-panel-lg user-management-modal user-management-modal-lg"
        : "modal-panel modal-panel-md user-management-modal";

  return (
    <div className="modal-overlay modal-overlay-blur" onClick={onClose}>
      <div className={shellClassName} onClick={(event) => event.stopPropagation()} role="presentation">
        <section aria-labelledby={ariaLabelledBy} className={panelClassName} role="dialog">
          {children}
        </section>
      </div>
    </div>
  );
}
