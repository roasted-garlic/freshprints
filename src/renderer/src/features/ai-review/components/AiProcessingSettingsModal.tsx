import { useEffect, useState } from "react";

import { Button } from "../../../shared/components/Button";
import { Select } from "../../../shared/components/Select";
import {
  ALL_VISION_MODEL_OPTIONS,
  OPENAI_REASONING_EFFORT_OPTIONS,
  isGeminiModelId,
} from "../../settings/constants/aiEnrichmentSettingsConstants";

interface AiProcessingSettingsModalProps {
  defaultReasoningEffort: string;
  defaultVisionModelId: string;
  isOpen: boolean;
  onApply: (visionModelId: string, reasoningEffort: string) => void;
  onCancel: () => void;
  onUseDefaults: () => void;
  reasoningEffort: string;
  visionModelId: string;
}

export function AiProcessingSettingsModal({
  defaultReasoningEffort,
  defaultVisionModelId,
  isOpen,
  onApply,
  onCancel,
  onUseDefaults,
  reasoningEffort,
  visionModelId,
}: AiProcessingSettingsModalProps) {
  const [selectedModel, setSelectedModel] = useState(visionModelId);
  const [selectedReasoning, setSelectedReasoning] = useState(reasoningEffort);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedModel(visionModelId);
    setSelectedReasoning(reasoningEffort);
  }, [isOpen, reasoningEffort, visionModelId]);

  if (!isOpen) {
    return null;
  }

  return (
    <div aria-modal="true" className="modal-overlay modal-overlay-blur" role="dialog">
      <div className="ai-processing-settings-modal">
        <h2 className="ai-processing-settings-modal-title">AI processing settings</h2>

        <div className="ai-processing-settings-modal-body">
          <Select
            label="Vision model"
            name="processingVisionModelId"
            onChange={(event) => setSelectedModel(event.target.value)}
            options={ALL_VISION_MODEL_OPTIONS.map((option) => ({
              label: option.label,
              value: option.value,
            }))}
            value={selectedModel}
          />

          {!isGeminiModelId(selectedModel) ? (
            <Select
              label="Reasoning effort"
              name="processingReasoningEffort"
              onChange={(event) => setSelectedReasoning(event.target.value)}
              options={OPENAI_REASONING_EFFORT_OPTIONS.map((option) => ({
                label: option.label,
                value: option.value,
              }))}
              value={selectedReasoning}
            />
          ) : (
            <div className="form-field">
              <label>Reasoning effort</label>
              <div className="form-input-shell form-select-shell">
                <button className="form-select-trigger" disabled type="button">
                  <span className="form-select-value">Not applicable for Gemini models</span>
                </button>
              </div>
            </div>
          )}

          <p className="ai-processing-settings-defaults">
            Default: {defaultVisionModelId} / {isGeminiModelId(defaultVisionModelId) ? "native reasoning" : defaultReasoningEffort}
          </p>
        </div>

        <div className="ai-processing-settings-modal-actions">
          <Button
            onClick={() => {
              onUseDefaults();
              onCancel();
            }}
            variant="secondary"
          >
            Use defaults
          </Button>
          <Button onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button onClick={() => onApply(selectedModel, selectedReasoning)} variant="primary">
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
