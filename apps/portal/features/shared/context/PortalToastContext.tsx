'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { XIcon } from '../components/PortalIcons';

export type PortalToastTone = 'success' | 'error';

export interface PortalToastAction {
  label: string;
  onClick: () => void;
}

export interface PortalToastOptions {
  action?: PortalToastAction;
}

interface PortalToast {
  id: number;
  message: string;
  tone: PortalToastTone;
  action?: PortalToastAction;
}

interface PortalToastContextValue {
  showToast: (message: string, tone?: PortalToastTone, options?: PortalToastOptions) => void;
  showSuccess: (message: string, options?: PortalToastOptions) => void;
  showError: (message: string, options?: PortalToastOptions) => void;
}

const PortalToastContext = createContext<PortalToastContextValue | null>(null);

const TOAST_DURATION_MS = 4000;

export function PortalToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<PortalToast | null>(null);
  const actionRef = useRef<PortalToastAction | undefined>(undefined);

  const dismiss = useCallback(() => {
    setToast(null);
    actionRef.current = undefined;
  }, []);

  const showToast = useCallback(
    (message: string, tone: PortalToastTone = 'success', options?: PortalToastOptions) => {
      const trimmed = message.trim();
      if (!trimmed) {
        return;
      }
      actionRef.current = options?.action;
      setToast({
        id: Date.now(),
        message: trimmed,
        tone,
        action: options?.action,
      });
    },
    [],
  );

  const showSuccess = useCallback(
    (message: string, options?: PortalToastOptions) => {
      showToast(message, 'success', options);
    },
    [showToast],
  );

  const showError = useCallback(
    (message: string, options?: PortalToastOptions) => {
      showToast(message, 'error', options);
    },
    [showToast],
  );

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
      actionRef.current = undefined;
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
            {toast.action ? (
              <button
                className="portal-toast-action"
                onClick={() => {
                  const action = actionRef.current ?? toast.action;
                  dismiss();
                  action?.onClick();
                }}
                type="button"
              >
                {toast.action.label}
              </button>
            ) : null}
            <button
              aria-label="Close notification"
              className="portal-toast-close"
              onClick={dismiss}
              type="button"
            >
              <XIcon size={14} />
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
