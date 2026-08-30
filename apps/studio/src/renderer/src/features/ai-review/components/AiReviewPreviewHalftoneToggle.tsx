interface AiReviewPreviewHalftoneToggleProps {
  disabled?: boolean;
  isActive: boolean;
  isSaving?: boolean;
  onChange: (markAsHalftone: boolean) => void;
}

export function AiReviewPreviewHalftoneToggle({
  disabled = false,
  isActive,
  isSaving = false,
  onChange,
}: AiReviewPreviewHalftoneToggleProps) {
  const isInteractive = !disabled && !isSaving;

  return (
    <button
      aria-label={isActive ? "Halftone on" : "Halftone off"}
      aria-pressed={isActive}
      className={
        "ai-review-preview-control-toggle ai-review-preview-halftone-toggle" +
        (isActive ? " is-active" : "")
      }
      disabled={!isInteractive}
      onClick={() => onChange(!isActive)}
      type="button"
    >
      <span
        aria-hidden="true"
        className="ai-review-preview-control-toggle-icon ai-review-preview-control-toggle-icon--halftone"
      />
      <span className="ai-review-preview-control-toggle-label">Halftone</span>
    </button>
  );
}
