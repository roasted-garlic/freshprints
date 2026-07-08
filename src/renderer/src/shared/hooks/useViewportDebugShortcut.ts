import { useCallback, useEffect, useState } from "react";

const VIEWPORT_DEBUG_SHORTCUT_KEY = "v";

export function useViewportDebugShortcut(onToggle: () => void) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.shiftKey || event.key.toLowerCase() !== VIEWPORT_DEBUG_SHORTCUT_KEY) {
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

export function useViewportDebugVisibility() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => {
    setIsOpen((current) => !current);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { close, isOpen, toggle };
}
