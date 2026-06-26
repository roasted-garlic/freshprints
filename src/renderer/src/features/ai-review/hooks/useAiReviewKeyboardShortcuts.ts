import { useEffect } from "react";

interface UseAiReviewKeyboardShortcutsOptions {
  canApprove: boolean;
  canReject: boolean;
  isEnabled: boolean;
  isInputFocused: boolean;
  onApprove: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onReject: () => void;
}

export function useAiReviewKeyboardShortcuts({
  canApprove,
  canReject,
  isEnabled,
  isInputFocused,
  onApprove,
  onNext,
  onPrevious,
  onReject,
}: UseAiReviewKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!isEnabled || isInputFocused) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "a" && canApprove) {
        event.preventDefault();
        onApprove();
        return;
      }

      if (key === "r" && canReject) {
        event.preventDefault();
        onReject();
        return;
      }

      if (key === "k") {
        event.preventDefault();
        onNext();
        return;
      }

      if (key === "j") {
        event.preventDefault();
        onPrevious();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canApprove,
    canReject,
    isEnabled,
    isInputFocused,
    onApprove,
    onNext,
    onPrevious,
    onReject,
  ]);
}
