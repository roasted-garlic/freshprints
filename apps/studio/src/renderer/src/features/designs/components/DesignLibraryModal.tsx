import type { ReactNode } from "react";

interface DesignLibraryModalProps {
  ariaLabelledBy: string;
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  shellClassName?: string;
  shellContent?: ReactNode;
}

export function DesignLibraryModal({
  ariaLabelledBy,
  children,
  isOpen,
  onClose,
  shellClassName,
  shellContent,
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
        {shellContent}
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
