import type { ReactNode } from "react";

interface DesignLibraryModalProps {
  ariaLabelledBy: string;
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export function DesignLibraryModal({
  ariaLabelledBy,
  children,
  isOpen,
  onClose,
}: DesignLibraryModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay modal-overlay-blur" onClick={onClose}>
      <div
        className="design-library-modal-shell"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <section
          aria-labelledby={ariaLabelledBy}
          className="modal-panel modal-panel-lg design-library-modal-panel"
          role="dialog"
        >
          {children}
        </section>
      </div>
    </div>
  );
}
