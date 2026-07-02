import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ConfirmLeaveDialog } from "../components/ConfirmLeaveDialog";
import { desktopAppService } from "../services/desktopAppService";
import { UploadActivityContext } from "./uploadActivityContext";

interface UploadActivityProviderProps {
  children: ReactNode;
}

export function UploadActivityProvider({ children }: UploadActivityProviderProps) {
  const [isUploadActive, setIsUploadActive] = useState(false);
  const [isCloseConfirmPending, setIsCloseConfirmPending] = useState(false);
  const [isLeaveConfirmPending, setIsLeaveConfirmPending] = useState(false);
  const cancelHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const leaveConfirmResolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  const setUploadActive = useCallback((active: boolean) => {
    setIsUploadActive(active);
  }, []);

  const registerCancelHandler = useCallback((handler: (() => Promise<void>) | null) => {
    cancelHandlerRef.current = handler;
  }, []);

  const requestCancelActiveUpload = useCallback(async () => {
    await cancelHandlerRef.current?.();
  }, []);

  useEffect(() => {
    void desktopAppService.setUploadActive(isUploadActive);
  }, [isUploadActive]);

  useEffect(() => {
    return desktopAppService.onConfirmCloseRequested(() => {
      setIsCloseConfirmPending(true);
    });
  }, []);

  const cancelPendingClose = useCallback(() => {
    setIsCloseConfirmPending(false);
  }, []);

  const confirmPendingClose = useCallback(() => {
    setIsCloseConfirmPending(false);
    void requestCancelActiveUpload().then(() => desktopAppService.confirmClose());
  }, [requestCancelActiveUpload]);

  // Rendered here (at the app-shell level, outside Sidebar's scrollable/stacking-context nav
  // panel) rather than inside Sidebar itself, so it's never visually clipped by the sidebar's
  // `overflow` + `isolation: isolate` — a fixed-position dialog nested inside that container was
  // clipped/invisible until an unrelated re-render forced a repaint.
  const requestLeaveConfirmation = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      leaveConfirmResolveRef.current = resolve;
      setIsLeaveConfirmPending(true);
    });
  }, []);

  const cancelPendingLeave = useCallback(() => {
    setIsLeaveConfirmPending(false);
    leaveConfirmResolveRef.current?.(false);
    leaveConfirmResolveRef.current = null;
  }, []);

  const confirmPendingLeave = useCallback(() => {
    setIsLeaveConfirmPending(false);
    void requestCancelActiveUpload().then(() => {
      leaveConfirmResolveRef.current?.(true);
      leaveConfirmResolveRef.current = null;
    });
  }, [requestCancelActiveUpload]);

  const value = useMemo(
    () => ({
      isUploadActive,
      setUploadActive,
      requestCancelActiveUpload,
      registerCancelHandler,
      requestLeaveConfirmation,
    }),
    [
      isUploadActive,
      setUploadActive,
      requestCancelActiveUpload,
      registerCancelHandler,
      requestLeaveConfirmation,
    ],
  );

  return (
    <UploadActivityContext.Provider value={value}>
      {children}

      <ConfirmLeaveDialog
        cancelLabel="Keep uploading"
        confirmLabel="Leave and cancel"
        copy="An import is currently uploading. Leaving this page will cancel the upload."
        isOpen={isLeaveConfirmPending}
        onCancel={cancelPendingLeave}
        onConfirm={confirmPendingLeave}
        title="Leave and cancel upload?"
      />

      <ConfirmLeaveDialog
        cancelLabel="Keep uploading"
        confirmLabel="Quit and cancel"
        copy="An import is currently uploading. Quitting Fresh Prints Studio will cancel the upload."
        isOpen={isCloseConfirmPending}
        onCancel={cancelPendingClose}
        onConfirm={confirmPendingClose}
        title="Quit and cancel upload?"
      />
    </UploadActivityContext.Provider>
  );
}
