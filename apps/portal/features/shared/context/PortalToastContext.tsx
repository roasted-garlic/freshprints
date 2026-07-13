'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type PortalToastTone = 'success' | 'error';

interface PortalToast {
  id: number;
  message: string;
  tone: PortalToastTone;
}

interface PortalToastContextValue {
  showToast: (message: string, tone?: PortalToastTone) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

const PortalToastContext = createContext<PortalToastContextValue | null>(null);

const TOAST_DURATION_MS = 4000;

export function PortalToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<PortalToast | null>(null);

  const showToast = useCallback((message: string, tone: PortalToastTone = 'success') => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }
    setToast({
      id: Date.now(),
      message: trimmed,
      tone,
    });
  }, []);

  const showSuccess = useCallback(
    (message: string) => {
      showToast(message, 'success');
    },
    [showToast],
  );

  const showError = useCallback(
    (message: string) => {
      showToast(message, 'error');
    },
    [showToast],
  );

  const dismiss = useCallback(() => {
    setToast(null);
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, TOAST_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const value = useMemo(
    () => ({
      showToast,
      showSuccess,
      showError,
    }),
    [showError, showSuccess, showToast],
  );

  return (
    <PortalToastContext.Provider value={value}>
      {children}
      {toast ? (
        <div className="portal-toast-viewport" aria-live="polite">
          <div
            className={`portal-toast portal-toast-${toast.tone}`}
            key={toast.id}
            role="status"
          >
            <p className="portal-toast-message">{toast.message}</p>
            <button
              aria-label="Dismiss notification"
              className="portal-toast-dismiss"
              onClick={dismiss}
              type="button"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </PortalToastContext.Provider>
  );
}

export function usePortalToast(): PortalToastContextValue {
  const context = useContext(PortalToastContext);
  if (!context) {
    throw new Error('usePortalToast must be used within PortalToastProvider');
  }
  return context;
}
