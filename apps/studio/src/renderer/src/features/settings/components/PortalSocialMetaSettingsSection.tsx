import { useEffect, useState } from "react";

import {
  DEFAULT_PORTAL_SOCIAL_META_SETTINGS,
  PORTAL_SOCIAL_META_DESCRIPTION_MAX_LENGTH,
  PORTAL_SOCIAL_META_TITLE_MAX_LENGTH,
  parsePortalSocialMetaSettingsInput,
  type PortalSocialMetaSettings,
} from "@fresh-prints/shared/constants/portal/portalSocialMetaSettings.constants";
import { Button } from "../../../shared/components/Button";
import { usePortalSocialMetaSettings } from "../hooks/usePortalSocialMetaSettings";

type SocialMetaDraft = {
  ogTitle: string;
  ogDescription: string;
};

function settingsToDraft(settings: PortalSocialMetaSettings): SocialMetaDraft {
  return {
    ogTitle: settings.ogTitle,
    ogDescription: settings.ogDescription,
  };
}

function draftEqualsSettings(draft: SocialMetaDraft, settings: PortalSocialMetaSettings): boolean {
  return draft.ogTitle === settings.ogTitle && draft.ogDescription === settings.ogDescription;
}

export function PortalSocialMetaSettingsSection() {
  const { error, isLoading, isSaving, save, saved, settings } = usePortalSocialMetaSettings();
  const [draft, setDraft] = useState<SocialMetaDraft>(() => settingsToDraft(settings));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(settingsToDraft(settings));
    setValidationError(null);
  }, [settings]);

  function setField<K extends keyof SocialMetaDraft>(key: K, value: SocialMetaDraft[K]) {
    setValidationError(null);
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    const parsed = parsePortalSocialMetaSettingsInput(draft);
    if (!parsed) {
      setValidationError(
        `Title (1–${PORTAL_SOCIAL_META_TITLE_MAX_LENGTH} chars) and description (1–${PORTAL_SOCIAL_META_DESCRIPTION_MAX_LENGTH} chars) are required.`,
      );
      return;
    }
    setValidationError(null);
    await save(parsed);
  }

  const displayError = validationError ?? error;
  const isDirty = !draftEqualsSettings(draft, settings);

  return (
    <section aria-labelledby="portal-social-meta-settings-title" className="card settings-section">
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="portal-social-meta-settings-title">
          Social sharing
        </h2>
        <p className="settings-section-description">
          Open Graph title and description for Portal link previews on non-design URLs (home, sign
          in, etc.). The preview image rotates daily among ready library designs. Per-design share
          links use that design’s own title, description, and image.
        </p>
      </header>

      {isLoading ? (
        <p aria-live="polite" className="settings-section-status">
          Loading social sharing settings…
        </p>
      ) : (
        <div className="settings-form-grid">
          <fieldset className="settings-control-item settings-quota-fieldset" disabled={isSaving}>
            <legend className="settings-field-hint">Global Open Graph</legend>
            <label className="settings-field-label" htmlFor="portalSocialMetaOgTitle">
              Title
              <input
                className="settings-text-input"
                id="portalSocialMetaOgTitle"
                maxLength={PORTAL_SOCIAL_META_TITLE_MAX_LENGTH}
                name="ogTitle"
                onChange={(event) => setField("ogTitle", event.target.value)}
                type="text"
                value={draft.ogTitle}
              />
              <span className="settings-field-hint">
                {draft.ogTitle.trim().length}/{PORTAL_SOCIAL_META_TITLE_MAX_LENGTH}
              </span>
            </label>
            <label className="settings-field-label" htmlFor="portalSocialMetaOgDescription">
              Description
              <textarea
                className="settings-textarea-input"
                id="portalSocialMetaOgDescription"
                maxLength={PORTAL_SOCIAL_META_DESCRIPTION_MAX_LENGTH}
                name="ogDescription"
                onChange={(event) => setField("ogDescription", event.target.value)}
                rows={4}
                value={draft.ogDescription}
              />
              <span className="settings-field-hint">
                {draft.ogDescription.trim().length}/{PORTAL_SOCIAL_META_DESCRIPTION_MAX_LENGTH}
              </span>
            </label>
          </fieldset>

          <div className="settings-form-actions">
            <Button
              disabled={isSaving}
              onClick={() => {
                setValidationError(null);
                setDraft(settingsToDraft({ ...DEFAULT_PORTAL_SOCIAL_META_SETTINGS }));
              }}
              type="button"
              variant="secondary"
            >
              Reset to defaults
            </Button>
            <Button
              disabled={isSaving || !isDirty}
              onClick={() => {
                void handleSave();
              }}
              type="button"
              variant="primary"
            >
              {isSaving ? "Saving…" : "Save social sharing"}
            </Button>
          </div>

          {saved && !displayError && !isDirty ? (
            <p aria-live="polite" className="auth-message auth-message-success">
              Social sharing settings saved.
            </p>
          ) : null}
          {displayError ? (
            <p className="auth-message auth-message-error" role="alert">
              {displayError}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
