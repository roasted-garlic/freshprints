import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { X } from "lucide-react";

const DEFAULT_DISMISS_DELAY_MS = 5000;

interface DismissibleSuccessAlertProps {
  message: string;
  onDismiss: () => void;
  dismissDelayMs?: number;
  showProgress?: boolean;
}

export function DismissibleSuccessAlert({
  message,
  onDismiss,
  dismissDelayMs = DEFAULT_DISMISS_DELAY_MS,
  showProgress = true,
}: DismissibleSuccessAlertProps) {
  const [progressSeed, setProgressSeed] = useState(0);
  const [activeDurationMs, setActiveDurationMs] = useState(dismissDelayMs);
  const [progressStart, setProgressStart] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const remainingMsRef = useRef(dismissDelayMs);
  const timerRef = useRef<number | null>(null);
  const segmentStartedAtRef = useRef(0);

  const clearDismissTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const beginDismissSegment = useCallback(
    (durationMs: number) => {
      clearDismissTimer();
      remainingMsRef.current = durationMs;
      segmentStartedAtRef.current = Date.now();
      timerRef.current = window.setTimeout(onDismiss, durationMs);
    },
    [clearDismissTimer, onDismiss],
  );

  useEffect(() => {
    setActiveDurationMs(dismissDelayMs);
    setProgressStart(1);
    setIsPaused(false);
    setProgressSeed((currentKey) => currentKey + 1);
    beginDismissSegment(dismissDelayMs);

    return clearDismissTimer;
  }, [beginDismissSegment, clearDismissTimer, dismissDelayMs, message, onDismiss]);

  const handleMouseEnter = useCallback(() => {
    if (!showProgress || isPaused) {
      return;
    }

    clearDismissTimer();
    const elapsed = Date.now() - segmentStartedAtRef.current;
    remainingMsRef.current = Math.max(0, activeDurationMs - elapsed);
    setIsPaused(true);
  }, [activeDurationMs, clearDismissTimer, isPaused, showProgress]);

  const handleMouseLeave = useCallback(() => {
    if (!showProgress || !isPaused) {
      return;
    }

    const remainingMs = remainingMsRef.current;

    if (remainingMs <= 0) {
      onDismiss();
      return;
    }

    setIsPaused(false);
    setActiveDurationMs(remainingMs);
    setProgressStart(remainingMs / dismissDelayMs);
    setProgressSeed((currentKey) => currentKey + 1);
    beginDismissSegment(remainingMs);
  }, [beginDismissSegment, dismissDelayMs, isPaused, onDismiss, showProgress]);

  if (!showProgress) {
    return (
      <div className="auth-message auth-message-success dismissible-success-alert-content" role="status">
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
    );
  }

  return (
    <div
      className="dismissible-success-alert auth-message auth-message-success"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
        className={`dismissible-success-alert-progress${isPaused ? " is-paused" : ""}`}
        key={progressSeed}
        style={
          {
            "--dismiss-duration": `${activeDurationMs}ms`,
            "--progress-start": progressStart,
          } as CSSProperties
        }
      />
    </div>
  );
}
