import { BrushCleaning, Minus, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "../../../shared/components/Button";
import type { Design } from "../types/design.types";
import { DesignPreviewLightbox } from "./DesignPreviewLightbox";
import { DesignThumbnailPanel } from "./DesignThumbnailPanel";
import { useDesignDerivativeUrl } from "../hooks/useDesignDerivativeUrl";

interface DesignSelectionCardProps {
  design: Design;
  isExistingSelection: boolean;
  isSelected: boolean;
  quantity: number;
  onAdd: (design: Design) => void;
  onQuantityChange: (designId: string, quantity: number) => void;
  onRemove: (designId: string) => void;
}

export function DesignSelectionCard({
  design,
  isSelected,
  quantity,
  onAdd,
  onQuantityChange,
  onRemove,
}: DesignSelectionCardProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [rawInput, setRawInput] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { url: previewUrl } = useDesignDerivativeUrl(design.previewPath ?? design.thumbnailPath);

  function commitQuantity(value: string) {
    const parsed = parseInt(value, 10);
    const next = Number.isFinite(parsed) && parsed >= 1 ? parsed : quantity;
    onQuantityChange(design.id, next);
    setRawInput(null);
  }

  return (
    <>
      <div className={`design-selection-card${isSelected ? " is-selected" : ""}`}>
        <div className="design-selection-card-image-wrap">
          <DesignThumbnailPanel
            alt={`${design.title} thumbnail`}
            catalogPath={design.thumbnailPath}
            className="design-card-thumbnail"
            decorative={false}
            fallbackLabel="Thumbnail unavailable"
            imageFit="contain"
            interactive
            loadingLabel="Loading thumbnail"
            onImageClick={() => setIsLightboxOpen(true)}
          />

          {isSelected ? (
            <button
              aria-label={`Remove ${design.title} from selection`}
              className="design-selection-card-remove-btn"
              onClick={() => onRemove(design.id)}
              type="button"
            >
              <BrushCleaning aria-hidden="true" size={15} strokeWidth={2} />
            </button>
          ) : null}
        </div>

        <div className="design-selection-card-body">
          <h3 className="design-selection-card-title">{design.title}</h3>

          {isSelected ? (
            <div className="design-selection-card-qty-controls">
              <button
                aria-label={quantity <= 1 ? `Remove ${design.title}` : `Decrease quantity for ${design.title}`}
                className="design-selection-card-qty-btn"
                onClick={() => {
                  if (quantity <= 1) {
                    onRemove(design.id);
                  } else {
                    onQuantityChange(design.id, quantity - 1);
                  }
                }}
                type="button"
              >
                {quantity <= 1 ? (
                  <Trash2 aria-hidden="true" size={16} strokeWidth={2} />
                ) : (
                  <Minus aria-hidden="true" size={16} strokeWidth={2} />
                )}
              </button>
              <input
                aria-label={`Quantity for ${design.title}`}
                className="design-selection-card-qty-input"
                inputMode="numeric"
                min={1}
                onBlur={(e) => commitQuantity(e.target.value)}
                onChange={(e) => setRawInput(e.target.value)}
                onFocus={() => setRawInput(String(quantity))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    inputRef.current?.blur();
                  }
                }}
                ref={inputRef}
                type="number"
                value={rawInput !== null ? rawInput : quantity}
              />
              <button
                aria-label={`Increase quantity for ${design.title}`}
                className="design-selection-card-qty-btn"
                onClick={() => onQuantityChange(design.id, quantity + 1)}
                type="button"
              >
                <Plus aria-hidden="true" size={16} strokeWidth={2} />
              </button>
            </div>
          ) : (
            <Button
              className="design-selection-card-add-btn"
              onClick={() => onAdd(design)}
              size="sm"
              variant="secondary"
            >
              Add to request
            </Button>
          )}
        </div>
      </div>

      <DesignPreviewLightbox
        alt={`${design.title} preview`}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        previewUrl={previewUrl ?? null}
      />
    </>
  );
}
