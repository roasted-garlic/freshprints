import { createContext, useContext } from "react";

import type {
  StaffInboxBadgeCounts,
  StaffInboxCompletedItem,
  StaffInboxItem,
} from "@fresh-prints/shared/staffInbox/staffInbox.types";

import type { StaffInboxAlertSoundKind } from "../types/staffInboxAlertSettings.types";

export interface StaffInboxToast {
  alertKind: StaffInboxAlertSoundKind;
  id: string;
  message: string;
  navigationPath: string;
  title: string;
}

export interface StaffInboxContextValue {
  openItems: StaffInboxItem[];
  completedItems: StaffInboxCompletedItem[];
  badgeCounts: StaffInboxBadgeCounts;
  toasts: StaffInboxToast[];
  isPanelOpen: boolean;
  isEnabled: boolean;
  error: string | null;
  warning: string | null;
  togglePanel: () => void;
  closePanel: () => void;
  acknowledgeItem: (item: StaffInboxItem) => void;
  restoreItem: (itemId: string) => void;
  dismissToast: (toastId: string) => void;
  openItem: (item: StaffInboxItem) => void;
  isItemHighlighted: (itemId: string) => boolean;
}

export const StaffInboxContext = createContext<StaffInboxContextValue | null>(null);

export function useStaffInboxContext(): StaffInboxContextValue {
  const context = useContext(StaffInboxContext);

  if (!context) {
    throw new Error("useStaffInboxContext must be used within StaffInboxProvider.");
  }

  return context;
}
