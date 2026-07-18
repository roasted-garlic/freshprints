import { createContext, useContext } from "react";

export interface AssistedMessagesInboxItem {
  id: string;
  requestId: string;
  customerLabel: string;
  preview: string;
  atMillis: number;
  statusLabel: string;
}

export interface AssistedMessagesContextValue {
  closeHistory: () => void;
  closePanel: () => void;
  error: string | null;
  isHistoryOpen: boolean;
  isPanelOpen: boolean;
  openHistory: () => void;
  openItem: (item: AssistedMessagesInboxItem) => void;
  /** Cleared / acked updates for the Message history modal. */
  readItems: AssistedMessagesInboxItem[];
  togglePanel: () => void;
  unreadCount: number;
  /** Unread updates for the live Messages dropdown. */
  unreadItems: AssistedMessagesInboxItem[];
}

export const AssistedMessagesContext = createContext<AssistedMessagesContextValue | null>(null);

export function useAssistedMessagesContext(): AssistedMessagesContextValue {
  const value = useContext(AssistedMessagesContext);
  if (!value) {
    throw new Error("useAssistedMessagesContext must be used within AssistedMessagesProvider");
  }
  return value;
}
