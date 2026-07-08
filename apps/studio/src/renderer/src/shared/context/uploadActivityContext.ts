import { createContext } from "react";

export interface UploadActivityDialogCopy {
  closeCancelLabel: string;
  closeConfirmLabel: string;
  closeCopy: string;
  closeTitle: string;
  leaveCancelLabel: string;
  leaveConfirmLabel: string;
  leaveCopy: string;
  leaveTitle: string;
}

export interface UploadActivityContextValue {
  isUploadActive: boolean;
  setUploadActive: (active: boolean) => void;
  /** Runs the active workflow's stop/cancel handler and resolves when it is safe to continue. */
  requestCancelActiveUpload: () => Promise<void>;
  registerCancelHandler: (handler: (() => Promise<void>) | null) => void;
  /**
   * Shows the shared active-workflow confirm dialog (rendered at the app-shell level,
   * outside any scroll/stacking-context container so it's never visually clipped) and resolves
   * once the user has answered: `true` if they confirmed leaving and the active workflow handler
   * has run, `false` if they chose to stay.
   */
  requestLeaveConfirmation: () => Promise<boolean>;
  setActivityDialogCopy: (copy: UploadActivityDialogCopy | null) => void;
}

export const UploadActivityContext = createContext<UploadActivityContextValue | null>(null);
