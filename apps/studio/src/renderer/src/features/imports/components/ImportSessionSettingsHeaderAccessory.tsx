import { Settings } from "lucide-react";

import { Button } from "../../../shared/components/Button";

interface ImportSessionSettingsHeaderAccessoryProps {
  onOpenSettings: () => void;
}

/** Settings control for AppHeader (left of inbox bells). Status text lives above the cards. */
export function ImportSessionSettingsHeaderAccessory({
  onOpenSettings,
}: ImportSessionSettingsHeaderAccessoryProps) {
  return (
    <div className="import-session-settings-header-accessory">
      <Button
        aria-label="Import settings"
        className="button-leading-icon"
        onClick={onOpenSettings}
        type="button"
        variant="secondary"
      >
        <Settings aria-hidden="true" size={16} strokeWidth={2} />
        Settings
      </Button>
    </div>
  );
}
