import { createContext } from "react";

export interface UploadActivityContextValue {
  isUploadActive: boolean;
  setUploadActive: (active: boolean) => void;
  /** Runs the active upload's real cancelImport flow and resolves once cleanup has finished. */
  requestCancelActiveUpload: () => Promise<void>;
  registerCancelHandler: (handler: (() => Promise<void>) | null) => void;
  /**
   * Shows the shared "leave and cancel upload?" confirm dialog (rendered at the app-shell level,
   * outside any scroll/stacking-context container so it's never visually clipped) and resolves
   * once the user has answered: `true` if they confirmed leaving (the active upload has already
   * been cancelled and cleaned up by the time this resolves), `false` if they chose to stay.
   */
  requestLeaveConfirmation: () => Promise<boolean>;
}

export const UploadActivityContext = createContext<UploadActivityContextValue | null>(null);
