import type { ReactNode } from "react";

interface DesignLibraryModalProps {
  ariaLabelledBy: string;
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  shellClassName?: string;
}

export function DesignLibraryModal({
  ariaLabelledBy,
  children,
  isOpen,
  onClose,
  shellClassName,
}: DesignLibraryModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay modal-overlay-blur" onClick={onClose}>
      <div
        className={["design-library-modal-shell", shellClassName].filter(Boolean).join(" ")}
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
