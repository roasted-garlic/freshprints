import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ConfirmLeaveDialog } from "../components/ConfirmLeaveDialog";
import { desktopAppService } from "../services/desktopAppService";
import type { UploadActivityDialogCopy } from "./uploadActivityContext";
import { UploadActivityContext } from "./uploadActivityContext";

interface UploadActivityProviderProps {
  children: ReactNode;
}

const uploadActivityDialogCopy: UploadActivityDialogCopy = {
  closeCancelLabel: "Keep uploading",
  closeConfirmLabel: "Quit and cancel",
  closeCopy: "An import is currently uploading. Quitting Fresh Prints Studio will cancel the upload.",
  closeTitle: "Quit and cancel upload?",
  leaveCancelLabel: "Keep uploading",
  leaveConfirmLabel: "Leave and cancel",
  leaveCopy: "An import is currently uploading. Leaving this page will cancel the upload.",
  leaveTitle: "Leave and cancel upload?",
};

export function UploadActivityProvider({ children }: UploadActivityProviderProps) {
  const [isUploadActive, setIsUploadActive] = useState(false);
  const [isCloseConfirmPending, setIsCloseConfirmPending] = useState(false);
  const [isLeaveConfirmPending, setIsLeaveConfirmPending] = useState(false);
  const [activityDialogCopy, setActivityDialogCopyState] = useState<UploadActivityDialogCopy>(
    uploadActivityDialogCopy,
  );
  const cancelHandlerRef = useRef<(() => Promise<void>) | null>(null);
  const leaveConfirmResolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  const setUploadActive = useCallback((active: boolean) => {
    setIsUploadActive(active);
  }, []);

  const registerCancelHandler = useCallback((handler: (() => Promise<void>) | null) => {
    cancelHandlerRef.current = handler;
  }, []);

  const setActivityDialogCopy = useCallback((copy: UploadActivityDialogCopy | null) => {
    setActivityDialogCopyState(copy ?? uploadActivityDialogCopy);
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
      setActivityDialogCopy,
    }),
    [
      isUploadActive,
      setUploadActive,
      requestCancelActiveUpload,
      registerCancelHandler,
      requestLeaveConfirmation,
      setActivityDialogCopy,
    ],
  );

  return (
    <UploadActivityContext.Provider value={value}>
      {children}

      <ConfirmLeaveDialog
        cancelLabel={activityDialogCopy.leaveCancelLabel}
        confirmLabel={activityDialogCopy.leaveConfirmLabel}
        copy={activityDialogCopy.leaveCopy}
        isOpen={isLeaveConfirmPending}
        onCancel={cancelPendingLeave}
        onConfirm={confirmPendingLeave}
        title={activityDialogCopy.leaveTitle}
      />

      <ConfirmLeaveDialog
        cancelLabel={activityDialogCopy.closeCancelLabel}
        confirmLabel={activityDialogCopy.closeConfirmLabel}
        copy={activityDialogCopy.closeCopy}
        isOpen={isCloseConfirmPending}
        onCancel={cancelPendingClose}
        onConfirm={confirmPendingClose}
        title={activityDialogCopy.closeTitle}
      />
    </UploadActivityContext.Provider>
  );
}
