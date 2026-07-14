interface AuthBusyOverlayProps {
  title: string;
  message?: string;
}

export function AuthBusyOverlay({ title, message }: AuthBusyOverlayProps) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="portal-auth-processing-overlay"
      role="status"
    >
      <div className="portal-auth-processing-card">
        <span aria-hidden="true" className="portal-loading-spinner portal-auth-processing-spinner" />
        <h2 className="portal-auth-processing-title">{title}</h2>
        {message ? <p className="portal-auth-processing-copy">{message}</p> : null}
      </div>
    </div>
  );
}
