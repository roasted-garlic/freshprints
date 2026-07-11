import { Button } from "../../../shared/components/Button";
import { TextInput } from "../../../shared/components/TextInput";
import { staffInboxAlertDesktopService } from "../services/staffInboxAlertSoundService";
import type {
  StaffInboxAlertSettings,
  StaffInboxAlertSoundKind,
  StaffInboxAlertSoundSourceKind,
} from "../types/staffInboxAlertSettings.types";
import { setStaffInboxAlertSoundSource } from "../types/staffInboxAlertSettings.types";

interface StaffInboxSoundSourceFieldProps {
  description: string;
  isDesktopAvailable: boolean;
  label: string;
  onChange: (settings: StaffInboxAlertSettings) => void;
  onError: (message: string | null) => void;
  onPreview?: () => void;
  previewLabel?: string;
  settings: StaffInboxAlertSettings;
  soundKind: StaffInboxAlertSoundKind;
  userId: string;
}

export function StaffInboxSoundSourceField({
  description,
  isDesktopAvailable,
  label,
  onChange,
  onError,
  onPreview,
  previewLabel = "Test sound",
  settings,
  soundKind,
  userId,
}: StaffInboxSoundSourceFieldProps) {
  const source =
    soundKind === "request_queued_to_show"
      ? settings.requestQueuedToShow
      : settings.showQueueFull;

  function updateSource(kind: StaffInboxAlertSoundSourceKind, value = source.value) {
    onChange(
      setStaffInboxAlertSoundSource(settings, soundKind, {
        kind,
        value: kind === "default" ? "" : value,
      }),
    );
  }

  async function handleUploadLocalSound() {
    onError(null);

    try {
      const result = await staffInboxAlertDesktopService.selectAndSaveLocalSound(userId, soundKind);

      if (result.canceled || !result.fileName) {
        return;
      }

      onChange(
        setStaffInboxAlertSoundSource(settings, soundKind, {
          kind: "local",
          value: result.fileName,
        }),
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to save the selected sound file.");
    }
  }

  async function handleClearLocalSound() {
    onError(null);

    try {
      await staffInboxAlertDesktopService.clearLocalSound(userId, soundKind);
      onChange(
        setStaffInboxAlertSoundSource(settings, soundKind, {
          kind: "default",
          value: "",
        }),
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to remove the saved sound file.");
    }
  }

  return (
    <section className="staff-inbox-sound-source-field">
      <div className="staff-inbox-sound-source-header">
        <h3>{label}</h3>
        <p>{description}</p>
      </div>

      <div className="staff-inbox-sound-source-tabs">
        <button
          className={`staff-inbox-sound-source-tab${source.kind === "default" ? " is-active" : ""}`}
          onClick={() => updateSource("default")}
          type="button"
        >
          Default
        </button>
        <button
          className={`staff-inbox-sound-source-tab${source.kind === "local" ? " is-active" : ""}`}
          disabled={!isDesktopAvailable}
          onClick={() => updateSource("local", source.kind === "local" ? source.value : "")}
          type="button"
        >
          Local file
        </button>
        <button
          className={`staff-inbox-sound-source-tab${source.kind === "url" ? " is-active" : ""}`}
          onClick={() => updateSource("url", source.kind === "url" ? source.value : "")}
          type="button"
        >
          Online URL
        </button>
      </div>

      {source.kind === "default" ? (
        <p className="staff-inbox-sound-source-hint">
          Uses the built-in alert tone on this computer. Upload a local file or set a URL to override.
        </p>
      ) : source.kind === "url" ? (
        <TextInput
          label="Sound file URL"
          name={`${soundKind}-url`}
          onChange={(event) => updateSource("url", event.target.value)}
          placeholder="https://example.com/sounds/alert.mp3"
          value={source.value}
        />
      ) : (
        <div className="staff-inbox-sound-source-local">
          <p className="staff-inbox-sound-source-local-label">Saved file on this computer</p>
          <p className="staff-inbox-sound-source-local-value">
            {source.value || "No local sound saved yet — default tone will play."}
          </p>
          <div className="staff-inbox-sound-source-local-actions">
            <Button onClick={() => void handleUploadLocalSound()} type="button" variant="secondary">
              Upload sound
            </Button>
            {source.value ? (
              <Button onClick={() => void handleClearLocalSound()} type="button" variant="secondary">
                Use default
              </Button>
            ) : null}
          </div>
          {!isDesktopAvailable ? (
            <p className="staff-inbox-sound-source-hint">
              Local upload is available in Fresh Prints Studio desktop only.
            </p>
          ) : (
            <p className="staff-inbox-sound-source-hint">
              Supported formats: MP3, WAV, OGG, M4A, AAC. Overrides apply only on this machine.
            </p>
          )}
        </div>
      )}

      {onPreview ? (
        <div className="staff-inbox-sound-source-preview">
          <Button onClick={onPreview} type="button" variant="secondary">
            {previewLabel}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
