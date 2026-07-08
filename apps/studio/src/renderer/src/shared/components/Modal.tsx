import type { HTMLAttributes, ReactNode } from "react";

interface ModalProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export function Modal({ children, className = "", ...props }: ModalProps) {
  return (
    <section className={`modal-panel ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}

interface ModalPageProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export function ModalPage({ children, className = "", ...props }: ModalPageProps) {
  return (
    <main className={`modal-page ${className}`.trim()} {...props}>
      {children}
    </main>
  );
}

interface ModalSectionProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function ModalHeader({ children, className = "", ...props }: ModalSectionProps) {
  return (
    <div className={`modal-header ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function ModalBody({ children, className = "", ...props }: ModalSectionProps) {
  return (
    <div className={`modal-body ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function ModalFooter({ children, className = "", ...props }: ModalSectionProps) {
  return (
    <div className={`modal-footer ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
