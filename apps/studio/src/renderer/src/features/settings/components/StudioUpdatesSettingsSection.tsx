import { Button } from "../../../shared/components/Button";
import { useStudioUpdate } from "../hooks/useStudioUpdate";

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export function StudioUpdatesSettingsSection() {
  const { checkForUpdate, downloadUpdate, postpone, restartAndInstall, state } = useStudioUpdate();

  return (
    <section aria-labelledby="studio-updates-settings-title" className="card settings-section">
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="studio-updates-settings-title">
          Studio updates
        </h2>
        <p className="settings-section-description">
          Fresh Prints Studio version {state.currentVersion || "unknown"} ·{" "}
          {state.channel === "prerelease" ? "Prerelease channel" : "Stable channel"}
        </p>
      </header>

      <div className="settings-form-grid">
        {!state.isUpdateCapable ? (
          <p className="settings-section-status">
            Automatic updates are only available in an installed, packaged copy of Studio.
          </p>
        ) : null}

        {state.isUpdateCapable && state.status === "idle" ? (
          <p className="settings-section-status">Ready to check for updates.</p>
        ) : null}

        {state.status === "checking" ? (
          <p aria-live="polite" className="settings-section-status">
            Checking for updates…
          </p>
        ) : null}

        {state.status === "up-to-date" ? (
          <p aria-live="polite" className="settings-section-status">
            You're on the latest version.
          </p>
        ) : null}

        {state.status === "error" ? (
          // state.errorMessage is always a short, fixed, pre-written string produced by
          // toSafeStudioUpdateError (packages/shared/src/studioUpdate/studioUpdateErrorMapping.ts)
          // in the main process — never derived from a raw error's message text, which can carry
          // HTTP response bodies, headers, or cookies. Rendered in a plain wrapping <p>, never a
          // <pre> or any container sized to fit arbitrary diagnostic payloads. The "Check for
          // updates" button below doubles as this state's retry action.
          <p className="auth-message auth-message-error" role="alert">
            {state.errorMessage ?? "The update service is temporarily unavailable."} Studio
            remains fully usable.
          </p>
        ) : null}

        {(state.status === "available" || state.status === "downloading" || state.status === "downloaded") &&
        state.availableRelease ? (
          <div className="settings-control-item">
            <p className="settings-field-label">
              Version {state.availableRelease.version} available
            </p>
            {state.availableRelease.releaseName ? (
              <p className="settings-field-hint">{state.availableRelease.releaseName}</p>
            ) : null}
            {state.availableRelease.releaseNotes ? (
              <pre className="settings-field-hint">{state.availableRelease.releaseNotes}</pre>
            ) : null}
          </div>
        ) : null}

        {state.status === "downloading" && state.downloadProgress ? (
          <p aria-live="polite" className="settings-section-status">
            Downloading update… {Math.round(state.downloadProgress.percent)}% (
            {formatBytes(state.downloadProgress.transferredBytes)} of{" "}
            {formatBytes(state.downloadProgress.totalBytes)})
          </p>
        ) : null}

        <div className="settings-form-actions">
          {state.isUpdateCapable && (state.status === "idle" || state.status === "up-to-date" || state.status === "error") ? (
            <Button onClick={() => void checkForUpdate()} variant="secondary">
              Check for updates
            </Button>
          ) : null}

          {state.status === "available" && !state.isPostponed ? (
            <>
              <Button onClick={() => void downloadUpdate()} variant="primary">
                Download update
              </Button>
              <Button onClick={() => void postpone()} variant="secondary">
                Remind me later
              </Button>
            </>
          ) : null}

          {state.status === "downloaded" ? (
            <Button onClick={() => void restartAndInstall()} variant="primary">
              Restart to Update
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
