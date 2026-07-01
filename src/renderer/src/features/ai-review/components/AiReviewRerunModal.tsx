import { useEffect, useState } from "react";

import { Button } from "../../../shared/components/Button";
import {
  OPENAI_REASONING_EFFORT_OPTIONS,
  OPENAI_VISION_MODEL_OPTIONS,
} from "../../settings/constants/aiEnrichmentSettingsConstants";

interface AiReviewRerunModalProps {
  currentReasoningEffort: string;
  currentVisionModelId: string;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: (visionModelId: string, reasoningEffort: string) => void;
}

export function AiReviewRerunModal({
  currentReasoningEffort,
  currentVisionModelId,
  isOpen,
  onCancel,
  onConfirm,
}: AiReviewRerunModalProps) {
  const [selectedModel, setSelectedModel] = useState(currentVisionModelId);
  const [selectedEffort, setSelectedEffort] = useState(currentReasoningEffort);

  useEffect(() => {
    if (isOpen) {
      setSelectedModel(currentVisionModelId);
      setSelectedEffort(currentReasoningEffort);
    }
  }, [isOpen, currentVisionModelId, currentReasoningEffort]);

  if (!isOpen) {
    return null;
  }

  function handleConfirm() {
    onConfirm(selectedModel, selectedEffort);
  }

  return (
    <div aria-modal="true" className="modal-overlay modal-overlay-blur" role="dialog">
      <div className="ai-rerun-modal">
        <h2 className="ai-rerun-modal-title">Re-run AI</h2>

        <div className="ai-rerun-modal-body">
          <fieldset className="ai-rerun-modal-fieldset">
            <legend className="ai-rerun-modal-legend">Vision model</legend>
            <div className="ai-rerun-modal-options">
              {OPENAI_VISION_MODEL_OPTIONS.map((option) => {
                const isDefault = option.value === currentVisionModelId;
                const isSelected = option.value === selectedModel;

                return (
                  <label
                    className={[
                      "ai-rerun-modal-option",
                      isSelected ? "ai-rerun-modal-option--selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={option.value}
                  >
                    <input
                      checked={isSelected}
                      className="ai-rerun-modal-radio"
                      name="rerun-model"
                      onChange={() => setSelectedModel(option.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span className="ai-rerun-modal-option-content">
                      <span className="ai-rerun-modal-option-header">
                        <span className="ai-rerun-modal-option-label">{option.shortLabel}</span>
                        {isDefault ? (
                          <span className="ai-rerun-modal-option-tag ai-rerun-modal-option-tag--default">
                            Saved default
                          </span>
                        ) : (
                          <span className="ai-rerun-modal-option-tag">{option.badgeLabel}</span>
                        )}
                      </span>
                      <span className="ai-rerun-modal-option-hint">{option.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="ai-rerun-modal-fieldset">
            <legend className="ai-rerun-modal-legend">Reasoning effort</legend>
            <div className="ai-rerun-modal-options">
              {OPENAI_REASONING_EFFORT_OPTIONS.map((option) => {
                const isDefault = option.value === currentReasoningEffort;
                const isSelected = option.value === selectedEffort;

                return (
                  <label
                    className={[
                      "ai-rerun-modal-option",
                      isSelected ? "ai-rerun-modal-option--selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={option.value}
                  >
                    <input
                      checked={isSelected}
                      className="ai-rerun-modal-radio"
                      name="rerun-effort"
                      onChange={() => setSelectedEffort(option.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span className="ai-rerun-modal-option-content">
                      <span className="ai-rerun-modal-option-header">
                        <span className="ai-rerun-modal-option-label">{option.label}</span>
                        {isDefault ? (
                          <span className="ai-rerun-modal-option-tag ai-rerun-modal-option-tag--default">
                            Saved default
                          </span>
                        ) : null}
                      </span>
                      <span className="ai-rerun-modal-option-hint">{option.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="ai-rerun-modal-actions">
          <Button onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleConfirm} variant="primary">
            Re-run AI
          </Button>
        </div>
      </div>
    </div>
  );
}
