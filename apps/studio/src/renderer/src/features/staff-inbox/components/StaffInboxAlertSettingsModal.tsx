import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "../../../shared/components/Button";
import { ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { UserManagementModal } from "../../users/components/UserManagementModal";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  previewStaffInboxAlertSound,
  staffInboxAlertDesktopService,
} from "../services/staffInboxAlertSoundService";
import {
  loadStaffInboxAlertSettings,
  saveStaffInboxAlertSettings,
} from "../services/staffInboxAlertSettingsStore";
import type { StaffInboxAlertSettings } from "../types/staffInboxAlertSettings.types";
import { StaffInboxSoundSourceField } from "./StaffInboxSoundSourceField";

interface StaffInboxAlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StaffInboxAlertSettingsModal({ isOpen, onClose }: StaffInboxAlertSettingsModalProps) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<StaffInboxAlertSettings>(() =>
    loadStaffInboxAlertSettings(user?.id ?? ""),
  );
  const [error, setError] = useState<string | null>(null);
  const isDesktopAvailable = staffInboxAlertDesktopService.isAvailable();

  useEffect(() => {
    if (!isOpen || !user?.id) {
      return;
    }

    setSettings(loadStaffInboxAlertSettings(user.id));
    setError(null);
  }, [isOpen, user?.id]);

  if (!isOpen || !user?.id) {
    return null;
  }

  function handleSave() {
    if (!user?.id) {
      return;
    }

    saveStaffInboxAlertSettings(user.id, settings);
    onClose();
  }

  async function handlePreview(kind: "request_queued_to_show" | "show_queue_full") {
    if (!user?.id) {
      return;
    }

    setError(null);

    try {
      await previewStaffInboxAlertSound(user.id, settings, kind);
    } catch (previewError) {
      setError(
        previewError instanceof Error ? previewError.message : "Unable to preview that sound.",
      );
    }
  }

  return (
    <UserManagementModal
      ariaLabelledBy="staff-inbox-alert-settings-title"
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
    >
      <ModalHeader>
        <div>
          <p className="eyebrow">Inbox</p>
          <h2 id="staff-inbox-alert-settings-title">Alert settings</h2>
          <p className="staff-inbox-settings-description">
            Turn audible alerts on or off for this computer. Each alert uses a built-in default tone
            unless you override it with a local file or URL.
          </p>
        </div>

        <button
          aria-label="Close alert settings"
          className="icon-button icon-button-md icon-button-ghost"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={18} strokeWidth={2.2} />
        </button>
      </ModalHeader>

      <ModalBody className="staff-inbox-settings-body">
        <label className="form-checkbox staff-inbox-settings-toggle">
          <input
            checked={settings.soundsEnabled}
            onChange={(event) => setSettings((current) => ({ ...current, soundsEnabled: event.target.checked }))}
            type="checkbox"
          />
          <span>Enable audible inbox alerts</span>
        </label>

        <div className="staff-inbox-settings-grid">
          <StaffInboxSoundSourceField
            description="When a portal print request is attached to a show queue."
            isDesktopAvailable={isDesktopAvailable}
            label="Queued to show"
            onChange={setSettings}
            onError={setError}
            onPreview={() => void handlePreview("request_queued_to_show")}
            previewLabel="Test sound"
            settings={settings}
            soundKind="request_queued_to_show"
            userId={user.id}
          />

          <StaffInboxSoundSourceField
            description="When a show queue with portal requests becomes full."
            isDesktopAvailable={isDesktopAvailable}
            label="Show queue full"
            onChange={setSettings}
            onError={setError}
            onPreview={() => void handlePreview("show_queue_full")}
            previewLabel="Test sound"
            settings={settings}
            soundKind="show_queue_full"
            userId={user.id}
          />
        </div>

        {error ? (
          <p className="auth-message auth-message-error" role="alert">
            {error}
          </p>
        ) : null}
      </ModalBody>

      <ModalFooter>
        <Button onClick={onClose} type="button" variant="secondary">
          Cancel
        </Button>
        <Button onClick={handleSave} type="button">
          Save settings
        </Button>
      </ModalFooter>
    </UserManagementModal>
  );
}
