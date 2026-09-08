import { Settings } from "lucide-react";

interface AiProcessingSettingsHeaderAccessoryProps {
  hasOverride: boolean;
  onOpenSettings: () => void;
}

/** Session vision-model settings control for AppHeader (near Auto). */
export function AiProcessingSettingsHeaderAccessory({
  hasOverride,
  onOpenSettings,
}: AiProcessingSettingsHeaderAccessoryProps) {
  return (
    <div className="ai-processing-settings-header-accessory">
      <button
        aria-label="AI processing session settings"
        className={[
          "icon-button icon-button-md icon-button-ghost ai-processing-settings-button",
          hasOverride ? "ai-processing-settings-button--active" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={onOpenSettings}
        title="Session AI model"
        type="button"
      >
        <Settings aria-hidden="true" size={18} strokeWidth={2.2} />
      </button>
    </div>
  );
}
