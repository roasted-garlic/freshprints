import type { ArtworkBackgroundFieldsValues } from "../../designs/components/ArtworkBackgroundFields";
import { resolveFormArtworkBackgroundHex } from "../../designs/utils/designFormMapper";

interface AiReviewPreviewBackgroundToggleProps {
  disabled?: boolean;
  isSaving?: boolean;
  onChange: (values: ArtworkBackgroundFieldsValues) => void;
  values: ArtworkBackgroundFieldsValues;
}

export function AiReviewPreviewBackgroundToggle({
  disabled = false,
  isSaving = false,
  onChange,
  values,
}: AiReviewPreviewBackgroundToggleProps) {
  const isDark = values.artworkBackgroundPreset === "lightBlack";
  const isInteractive = !disabled && !isSaving;
  const swatchHex = resolveFormArtworkBackgroundHex({
    title: "",
    description: "",
    categoryId: "",
    tagsInput: "",
    ...values,
  });

  return (
    <button
      aria-label={isDark ? "Dark background" : "Grey background"}
      aria-pressed={isDark}
      className={
        "ai-review-preview-control-toggle ai-review-preview-bg-toggle" +
        (isDark ? " is-active" : "")
      }
      disabled={!isInteractive}
      onClick={() =>
        onChange({
          artworkBackgroundPreset: isDark ? "grey" : "lightBlack",
          artworkBackgroundCustomHex: "",
        })
      }
      type="button"
    >
      <span
        aria-hidden="true"
        className="ai-review-preview-control-toggle-swatch"
        style={{ backgroundColor: swatchHex }}
      />
      <span className="ai-review-preview-control-toggle-label">Background</span>
    </button>
  );
}
