import { useEffect, useState } from "react";

import {
  DEFAULT_PORTAL_SOCIAL_META_SETTINGS,
  PORTAL_LIBRARY_OG_ROTATION_SALT_MAX,
  PORTAL_SOCIAL_META_DESCRIPTION_MAX_LENGTH,
  PORTAL_SOCIAL_META_TITLE_MAX_LENGTH,
  parsePortalSocialMetaSettingsInput,
  type PortalGlobalOgImageSource,
  type PortalLibraryOgRotationInterval,
  type PortalSocialMetaSettings,
} from "@fresh-prints/shared/constants/portal/portalSocialMetaSettings.constants";
import { Button } from "../../../shared/components/Button";
import { Checkbox } from "../../../shared/components/Checkbox";
import { Select } from "../../../shared/components/Select";
import { usePortalSocialMetaSettings } from "../hooks/usePortalSocialMetaSettings";

type SocialMetaDraft = {
  ogTitle: string;
  ogDescription: string;
  letterboxOgImages: boolean;
  globalOgImageSource: PortalGlobalOgImageSource;
  libraryOgRotationInterval: PortalLibraryOgRotationInterval;
  libraryOgRotationSalt: number;
};

const LIBRARY_INTERVAL_OPTIONS: { label: string; value: PortalLibraryOgRotationInterval }[] = [
  { label: "Daily", value: "daily" },
  { label: "Hourly", value: "hourly" },
  { label: "Every 5 minutes", value: "5min" },
  { label: "Every 1 minute", value: "1min" },
  { label: "Every 30 seconds", value: "30s" },
];

function settingsToDraft(settings: PortalSocialMetaSettings): SocialMetaDraft {
  return {
    ogTitle: settings.ogTitle,
    ogDescription: settings.ogDescription,
    letterboxOgImages: settings.letterboxOgImages,
    globalOgImageSource: settings.globalOgImageSource,
    libraryOgRotationInterval: settings.libraryOgRotationInterval,
    libraryOgRotationSalt: settings.libraryOgRotationSalt,
  };
}

function draftEqualsSettings(draft: SocialMetaDraft, settings: PortalSocialMetaSettings): boolean {
  return (
    draft.ogTitle === settings.ogTitle &&
    draft.ogDescription === settings.ogDescription &&
    draft.letterboxOgImages === settings.letterboxOgImages &&
    draft.globalOgImageSource === settings.globalOgImageSource &&
    draft.libraryOgRotationInterval === settings.libraryOgRotationInterval &&
    draft.libraryOgRotationSalt === settings.libraryOgRotationSalt
  );
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

  async function handleSave(nextDraft: SocialMetaDraft = draft) {
    const parsed = parsePortalSocialMetaSettingsInput(nextDraft);
    if (!parsed) {
      setValidationError(
        `Title (1–${PORTAL_SOCIAL_META_TITLE_MAX_LENGTH} chars) and description (1–${PORTAL_SOCIAL_META_DESCRIPTION_MAX_LENGTH} chars) are required.`,
      );
      return;
    }
    setValidationError(null);
    await save(parsed);
  }

  async function handleRefreshLibraryPreview() {
    const nextSalt =
      draft.libraryOgRotationSalt >= PORTAL_LIBRARY_OG_ROTATION_SALT_MAX
        ? 0
        : draft.libraryOgRotationSalt + 1;
    const nextDraft = { ...draft, libraryOgRotationSalt: nextSalt };
    setDraft(nextDraft);
    await handleSave(nextDraft);
  }

  const displayError = validationError ?? error;
  const isDirty = !draftEqualsSettings(draft, settings);
  const librarySelected = draft.globalOgImageSource === "library";

  return (
    <section aria-labelledby="portal-social-meta-settings-title" className="card settings-section">
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="portal-social-meta-settings-title">
          Social sharing
        </h2>
        <p className="settings-section-description">
          Open Graph title and description for Portal link previews on non-design URLs (home, catalog,
          login, etc.). Library preview images rotate on the interval you choose (UTC-aligned buckets).
          Facebook, WhatsApp, and Messenger cache previews by page URL, so there is no reliable “new
          image on every share” — use a short interval or Pick next for testing. Letterboxing pads
          designs into Facebook’s wide preview so the full artwork is visible. Per-design share links
          still use that design’s own title, description, image, and artwork background. After changing
          settings, re-scrape URLs in Facebook Sharing Debugger (previews are cached).
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

          <fieldset className="settings-control-item settings-quota-fieldset" disabled={isSaving}>
            <legend className="settings-field-hint">Preview images</legend>
            <Select
              disabled={isSaving}
              label="Global preview image"
              name="globalOgImageSource"
              onChange={(event) =>
                setField("globalOgImageSource", event.target.value as PortalGlobalOgImageSource)
              }
              options={[
                { label: "Library (rotate)", value: "library" },
                { label: "Brand logo", value: "logo" },
              ]}
              value={draft.globalOgImageSource}
            />
            <Select
              disabled={isSaving || !librarySelected}
              label="Library rotation interval"
              name="libraryOgRotationInterval"
              onChange={(event) =>
                setField(
                  "libraryOgRotationInterval",
                  event.target.value as PortalLibraryOgRotationInterval,
                )
              }
              options={LIBRARY_INTERVAL_OPTIONS}
              value={draft.libraryOgRotationInterval}
            />
            <p className="settings-field-hint">
              Applies to Portal URLs that are not design share links (`/share/design/…`). The chosen
              library design stays the same until the next interval bucket (or you use Pick next).
              Shorter intervals rotate more often but social apps may still show a cached preview until
              they re-scrape.
            </p>
            <div className="settings-form-actions">
              <Button
                disabled={isSaving || !librarySelected}
                onClick={() => {
                  void handleRefreshLibraryPreview();
                }}
                type="button"
                variant="secondary"
              >
                {isSaving ? "Saving…" : "Pick next library preview"}
              </Button>
            </div>
            <p className="settings-field-hint">
              Advances the library rotation immediately for testing. Then Scrape Again on home or
              `/custom-designs` in Facebook Debugger to see the new image.
            </p>
            <Checkbox
              checked={draft.letterboxOgImages}
              disabled={isSaving}
              label="Letterbox share images (show full design in wide previews)"
              name="letterboxOgImages"
              onChange={(event) => setField("letterboxOgImages", event.target.checked)}
            />
            <p className="settings-field-hint">
              When on, designs are fitted onto a 1200×630 card with margins using each design’s
              artwork background (default grey). When off, Facebook may crop square or tall artwork.
            </p>
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
