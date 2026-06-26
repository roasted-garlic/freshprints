import { useEffect, useState, type CSSProperties } from "react";
import { X } from "lucide-react";

const DEFAULT_DISMISS_DELAY_MS = 5000;

interface DismissibleSuccessAlertProps {
  message: string;
  onDismiss: () => void;
  dismissDelayMs?: number;
}

export function DismissibleSuccessAlert({
  message,
  onDismiss,
  dismissDelayMs = DEFAULT_DISMISS_DELAY_MS,
}: DismissibleSuccessAlertProps) {
  const [progressKey, setProgressKey] = useState(0);

  useEffect(() => {
    setProgressKey((currentKey) => currentKey + 1);

    const timer = window.setTimeout(onDismiss, dismissDelayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [dismissDelayMs, message, onDismiss]);

  return (
    <div
      className="dismissible-success-alert auth-message auth-message-success"
      role="status"
    >
      <div className="dismissible-success-alert-content">
        <p className="dismissible-success-alert-message">{message}</p>
        <button
          aria-label="Dismiss success message"
          className="dismissible-success-alert-close"
          onClick={onDismiss}
          type="button"
        >
          <X aria-hidden="true" size={16} strokeWidth={2.2} />
        </button>
      </div>
      <div
        aria-hidden="true"
        className="dismissible-success-alert-progress"
        key={progressKey}
        style={{ "--dismiss-duration": `${dismissDelayMs}ms` } as CSSProperties}
      />
    </div>
  );
}
