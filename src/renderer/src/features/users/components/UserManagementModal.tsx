import type { ReactNode } from "react";

interface UserManagementModalProps {
  ariaLabelledBy: string;
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export function UserManagementModal({
  ariaLabelledBy,
  children,
  isOpen,
  onClose,
}: UserManagementModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay modal-overlay-blur" onClick={onClose}>
      <div
        className="user-management-modal-shell"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <section
          aria-labelledby={ariaLabelledBy}
          className="modal-panel modal-panel-md user-management-modal"
          role="dialog"
        >
          {children}
        </section>
      </div>
    </div>
  );
}
