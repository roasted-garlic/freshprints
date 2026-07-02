import type { ReactNode } from "react";

interface ImportMethodCardOverlayProps {
  children?: ReactNode;
  message?: string;
}

export function ImportMethodCardOverlay({ children, message }: ImportMethodCardOverlayProps) {
  return (
    <div
      aria-live={message ? "polite" : undefined}
      className="imports-method-card-overlay"
      role={message ? "status" : undefined}
    >
      {message ? <p className="imports-method-card-overlay-message">{message}</p> : null}
      {children ? <div className="imports-method-card-overlay-actions">{children}</div> : null}
    </div>
  );
}
