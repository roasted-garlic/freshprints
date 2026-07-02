import { useEffect, useState } from "react";

import { Button } from "../../../shared/components/Button";
import { Select } from "../../../shared/components/Select";
import { ALL_VISION_MODEL_OPTIONS } from "../../settings/constants/aiEnrichmentSettingsConstants";

interface AiProcessingSettingsModalProps {
  defaultVisionModelId: string;
  isOpen: boolean;
  onApply: (visionModelId: string) => void;
  onCancel: () => void;
  onUseDefaults: () => void;
  visionModelId: string;
}

export function AiProcessingSettingsModal({
  defaultVisionModelId,
  isOpen,
  onApply,
  onCancel,
  onUseDefaults,
  visionModelId,
}: AiProcessingSettingsModalProps) {
  const [selectedModel, setSelectedModel] = useState(visionModelId);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedModel(visionModelId);
  }, [isOpen, visionModelId]);

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

          <p className="ai-processing-settings-defaults">Default: {defaultVisionModelId}</p>
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
          <Button onClick={() => onApply(selectedModel)} variant="primary">
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
