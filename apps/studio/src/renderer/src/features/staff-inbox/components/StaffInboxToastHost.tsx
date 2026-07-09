import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../../../shared/components/Button";
import { useStaffInboxContext } from "../context/staffInboxContext";

const TOAST_AUTO_DISMISS_MS = 12_000;

export function StaffInboxToastHost() {
  const navigate = useNavigate();
  const { dismissToast, isEnabled, toasts } = useStaffInboxContext();

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      dismissToast(toasts[0]!.id);
    }, TOAST_AUTO_DISMISS_MS);

    return () => window.clearTimeout(timeoutId);
  }, [dismissToast, toasts]);

  if (!isEnabled || toasts.length === 0) {
    return null;
  }

  return (
    <div aria-live="polite" className="staff-inbox-toast-host">
      {toasts.map((toast) => (
        <div className="staff-inbox-toast" key={toast.id} role="status">
          <div className="staff-inbox-toast-copy">
            <p className="staff-inbox-toast-title">{toast.title}</p>
            <p className="staff-inbox-toast-message">{toast.message}</p>
          </div>
          <div className="staff-inbox-toast-actions">
            <Button
              onClick={() => {
                dismissToast(toast.id);
                navigate(toast.navigationPath);
              }}
              variant="secondary"
            >
              Open
            </Button>
            <Button onClick={() => dismissToast(toast.id)} variant="secondary">
              Dismiss
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
