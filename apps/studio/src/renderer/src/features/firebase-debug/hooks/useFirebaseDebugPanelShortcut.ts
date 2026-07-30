import { useCallback, useEffect, useState } from "react";

const FIREBASE_DEBUG_PANEL_SHORTCUT_KEY = "f";

export function useFirebaseDebugPanelShortcut(onToggle: () => void) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (
        !event.ctrlKey ||
        !event.shiftKey ||
        event.key.toLowerCase() !== FIREBASE_DEBUG_PANEL_SHORTCUT_KEY
      ) {
        return;
      }

      event.preventDefault();
      onToggle();
    },
    [onToggle],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export function useFirebaseDebugPanelVisibility() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => {
    setIsOpen((current) => !current);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { close, isOpen, toggle };
}
