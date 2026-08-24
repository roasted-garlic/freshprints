import { useEffect, useRef, useState } from "react";
import { ChevronDown, WandSparkles } from "lucide-react";

import type { GangSheetLayoutMode } from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";
import { Button } from "../../../shared/components/Button";
import { GANG_SHEET_LAYOUT_MODE_OPTIONS } from "../utils/gangSheetLayoutModeOptions";

type GangSheetMenuButtonSize = "sm" | "md" | "lg";
type GangSheetMenuButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "warning"
  | "success"
  | "success-outline";

interface GangSheetLayoutModeMenuProps {
  disabled?: boolean;
  isBusy?: boolean;
  label: string;
  menuId: string;
  onSelect: (mode: GangSheetLayoutMode) => void;
  size?: GangSheetMenuButtonSize;
  title?: string;
  variant?: GangSheetMenuButtonVariant;
}

export function GangSheetLayoutModeMenu({
  disabled = false,
  isBusy = false,
  label,
  menuId,
  onSelect,
  size = "sm",
  title,
  variant = "success-outline",
}: GangSheetLayoutModeMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleSelect(mode: GangSheetLayoutMode) {
    setIsOpen(false);
    onSelect(mode);
  }

  return (
    <div className="export-menu-shell" ref={menuRef}>
      <Button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="button-leading-icon"
        disabled={disabled || isBusy}
        onClick={() => setIsOpen((current) => !current)}
        size={size}
        title={title}
        variant={variant}
      >
        <WandSparkles aria-hidden="true" size={16} strokeWidth={2} />
        {isBusy ? "Generating..." : label}
        <ChevronDown aria-hidden="true" size={14} strokeWidth={2.4} />
      </Button>

      {isOpen ? (
        <div aria-label="Gang sheet layout options" className="export-menu" id={menuId} role="menu">
          {GANG_SHEET_LAYOUT_MODE_OPTIONS.map((option) => (
            <button
              className="export-menu-option"
              key={option.mode}
              onClick={() => handleSelect(option.mode)}
              role="menuitem"
              type="button"
            >
              <span>{option.label}</span>
              <span className="export-menu-option-hint">{option.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
