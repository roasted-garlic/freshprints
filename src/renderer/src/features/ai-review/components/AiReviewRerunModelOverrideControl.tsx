import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "../../../shared/components/Button";
import { ALL_VISION_MODEL_OPTIONS } from "../../settings/constants/aiEnrichmentSettingsConstants";

interface AiReviewRerunModelOverrideControlProps {
  buttonLabel?: string;
  currentVisionModelId: string;
  disabled?: boolean;
  onSelect: (modelId: string) => void;
}

export function AiReviewRerunModelOverrideControl({
  buttonLabel = "Re-run AI",
  currentVisionModelId,
  disabled = false,
  onSelect,
}: AiReviewRerunModelOverrideControlProps) {
  const menuId = useId();
  const shellRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!shellRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  return (
    <div className="ai-review-rerun-model-control" ref={shellRef}>
      <Button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        size="sm"
        variant="secondary"
      >
        <span>{buttonLabel}</span>
        <ChevronDown
          aria-hidden="true"
          className="ai-review-rerun-menu-chevron"
          size={14}
          strokeWidth={2.4}
        />
      </Button>

      {isOpen ? (
        <div
          aria-label="AI re-run model options"
          className="ai-review-rerun-model-menu"
          id={menuId}
          role="menu"
        >
          {ALL_VISION_MODEL_OPTIONS.map((option) => (
            <button
              className="ai-review-rerun-model-option"
              key={option.value}
              onClick={() => {
                setIsOpen(false);
                onSelect(option.value);
              }}
              role="menuitem"
              type="button"
            >
              <span className="ai-review-rerun-model-option-main">
                <span className="ai-review-rerun-model-option-label">{option.shortLabel}</span>
                <span className="ai-review-rerun-model-option-badge">
                  {option.value === currentVisionModelId ? "Saved default" : option.badgeLabel}
                </span>
              </span>
              <span className="ai-review-rerun-model-option-hint">{option.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
