import { useEffect, useId, useRef, useState } from "react";

import {
  DEFAULT_PORTAL_SOCIAL_META_SETTINGS,
  PORTAL_LIBRARY_OG_ROTATION_SALT_MAX,
  PORTAL_SOCIAL_META_DESCRIPTION_MAX_LENGTH,
  PORTAL_SOCIAL_META_TITLE_MAX_LENGTH,
  PORTAL_STATIC_OG_IMAGE_MAX_BYTES,
  parsePortalSocialMetaSettingsInput,
  type PortalGlobalOgImageSource,
  type PortalLibraryOgRotationInterval,
  type PortalSocialMetaSettings,
  type PortalStaticOgImageInput,
} from "@fresh-prints/shared/constants/portal/portalSocialMetaSettings.constants";
import { Button } from "../../../shared/components/Button";
import { Checkbox } from "../../../shared/components/Checkbox";
import { Select } from "../../../shared/components/Select";
import { designDerivativeUrlService } from "../../designs/services/designDerivativeUrlService";
import type { Design } from "../../designs/types/design.types";
import { usePortalSocialMetaSettings } from "../hooks/usePortalSocialMetaSettings";
import { portalSocialMetaSettingsService } from "../services/portalSocialMetaSettingsService";
import { PortalStaticOgDesignPickerModal } from "./PortalStaticOgDesignPickerModal";

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

function draftEqualsSettings(
  draft: SocialMetaDraft,
  settings: PortalSocialMetaSettings,
  pendingStatic: PortalStaticOgImageInput | null,
  pendingPreviewUrl: string | null,
): boolean {
  if (pendingStatic !== null || pendingPreviewUrl !== null) {
    return false;
  }
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
  const [pendingStatic, setPendingStatic] = useState<PortalStaticOgImageInput | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(settingsToDraft(settings));
    setValidationError(null);
    setPendingStatic(null);
    setPendingPreviewUrl((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }, [settings]);

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(pendingPreviewUrl);
      }
    };
  }, [pendingPreviewUrl]);

  function setField<K extends keyof SocialMetaDraft>(key: K, value: SocialMetaDraft[K]) {
    setValidationError(null);
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(nextDraft: SocialMetaDraft = draft) {
    const staticOgImage: PortalStaticOgImageInput | undefined =
      pendingStatic ??
      (nextDraft.globalOgImageSource === "static"
        ? settings.staticOgImage
          ? { kind: "retain" }
          : undefined
        : undefined);

    const parsed = parsePortalSocialMetaSettingsInput({
      ...nextDraft,
      ...(staticOgImage ? { staticOgImage } : {}),
    });
    if (!parsed) {
      setValidationError(
        `Title (1–${PORTAL_SOCIAL_META_TITLE_MAX_LENGTH} chars) and description (1–${PORTAL_SOCIAL_META_DESCRIPTION_MAX_LENGTH} chars) are required.`,
      );
      return;
    }
    if (parsed.globalOgImageSource === "static" && !parsed.staticOgImage && !settings.staticOgImage) {
      setValidationError("Static Image mode needs an upload or a Design Library pick before Save.");
      return;
    }
    if (parsed.globalOgImageSource === "static" && !parsed.staticOgImage && settings.staticOgImage) {
      parsed.staticOgImage = { kind: "retain" };
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

  async function handleStaticFileSelected(file: File | undefined) {
    if (!file) {
      return;
    }
    setValidationError(null);
    setIsUploading(true);
    try {
      const { storagePath } = await portalSocialMetaSettingsService.uploadStaticOgImage(file);
      if (pendingPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(pendingPreviewUrl);
      }
      setPendingStatic({ kind: "upload", storagePath });
      setPendingPreviewUrl(URL.createObjectURL(file));
      setField("globalOgImageSource", "static");
    } catch (uploadError) {
      setValidationError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload static Open Graph image.",
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDesignPicked(design: Design) {
    if (pendingPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(pendingPreviewUrl);
    }
    setPendingStatic({ kind: "design", sourceDesignId: design.id });
    setPendingPreviewUrl(null);
    setField("globalOgImageSource", "static");
    setPickerOpen(false);

    const previewUrl =
      (await designDerivativeUrlService.getPreviewUrl(design)) ??
      (await designDerivativeUrlService.getThumbnailUrl(design));
    if (previewUrl) {
      setPendingPreviewUrl(previewUrl);
    }
  }

  const displayError = validationError ?? error;
  const isDirty = !draftEqualsSettings(draft, settings, pendingStatic, pendingPreviewUrl);
  const librarySelected = draft.globalOgImageSource === "library";
  const staticSelected = draft.globalOgImageSource === "static";
  const staticPreviewUrl =
    pendingPreviewUrl ??
    settings.staticOgImage?.downloadUrl ??
    null;
  const staticProvenance =
    pendingStatic?.kind === "design"
      ? `Design Library pick (saved on Save)`
      : pendingStatic?.kind === "upload"
        ? "New upload (saved on Save)"
        : settings.staticOgImage?.sourceDesignId
          ? `Design Library snapshot`
          : settings.staticOgImage?.kind === "upload"
            ? "Uploaded image"
            : null;
  const busy = isSaving || isUploading;

  return (
    <section aria-labelledby="portal-social-meta-settings-title" className="card settings-section">
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="portal-social-meta-settings-title">
          Social sharing
        </h2>
        <p className="settings-section-description">
          Open Graph title and description for Portal link previews on non-design URLs (home, catalog,
          login, etc.). Library preview images rotate on the interval you choose (UTC-aligned buckets).
          Static Image uses one upload or Design Library pick snapshotted at Save, then Fresh Prints’
          social letterbox (1200×630 contain) for crawler previews. Facebook, WhatsApp,
          and Messenger cache previews by page URL — use Scrape Again after changing settings.
          Per-design share links still use that design’s own title, description, image, and artwork
          background.
        </p>
      </header>

      {isLoading ? (
        <p aria-live="polite" className="settings-section-status">
          Loading social sharing settings…
        </p>
      ) : (
        <div className="settings-form-grid">
          <fieldset className="settings-control-item settings-quota-fieldset" disabled={busy}>
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

          <fieldset className="settings-control-item settings-quota-fieldset" disabled={busy}>
            <legend className="settings-field-hint">Preview images</legend>
            <Select
              disabled={busy}
              label="Global preview image"
              name="globalOgImageSource"
              onChange={(event) =>
                setField("globalOgImageSource", event.target.value as PortalGlobalOgImageSource)
              }
              options={[
                { label: "Library (rotate)", value: "library" },
                { label: "Brand logo", value: "logo" },
                { label: "Static image", value: "static" },
              ]}
              value={draft.globalOgImageSource}
            />
            <Select
              disabled={busy || !librarySelected}
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
                disabled={busy || !librarySelected}
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

            <div className="settings-control-item">
              <p className="settings-field-label">Static image</p>
              <p className="settings-field-hint">
                Upload a PNG/JPEG/WebP (max {Math.floor(PORTAL_STATIC_OG_IMAGE_MAX_BYTES / (1024 * 1024))}{" "}
                MB) or pick a ready Design Library design. The resolved asset is stored on Save with
                title and description.
              </p>
              <div className="settings-form-actions">
                <input
                  accept="image/png,image/jpeg,image/webp"
                  className="settings-file-input-hidden"
                  disabled={busy}
                  id={fileInputId}
                  onChange={(event) => {
                    void handleStaticFileSelected(event.target.files?.[0]);
                  }}
                  ref={fileInputRef}
                  type="file"
                />
                <Button
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                  variant="secondary"
                >
                  {isUploading ? "Uploading…" : "Upload image"}
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => setPickerOpen(true)}
                  type="button"
                  variant="secondary"
                >
                  Choose from Design Library
                </Button>
              </div>
              {staticSelected || staticPreviewUrl ? (
                <div className="settings-brand-logo-preview-wrap settings-og-static-preview-wrap">
                  {staticPreviewUrl ? (
                    <img
                      alt="Static Open Graph preview"
                      className="settings-brand-logo-preview settings-og-static-preview"
                      src={staticPreviewUrl}
                    />
                  ) : pendingStatic?.kind === "design" ? (
                    <p className="settings-field-hint">Loading design preview…</p>
                  ) : (
                    <p className="settings-field-hint">No static image saved yet.</p>
                  )}
                  {staticProvenance ? (
                    <p className="settings-field-hint">{staticProvenance}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <Checkbox
              checked={draft.letterboxOgImages}
              disabled={busy}
              label="Letterbox share images (show full design in wide previews)"
              name="letterboxOgImages"
              onChange={(event) => setField("letterboxOgImages", event.target.checked)}
            />
            <p className="settings-field-hint">
              When on, designs are fitted onto a 1200×630 card with margins using each design’s
              artwork background (default grey). When off, Facebook may crop square or tall artwork.
              Letterboxing applies to library and design-share images when enabled. Static Image
              always uses the Fresh Prints social letterbox treatment (never raw crop).
            </p>
          </fieldset>

          <div className="settings-form-actions">
            <Button
              disabled={busy}
              onClick={() => {
                setValidationError(null);
                setPendingStatic(null);
                setPendingPreviewUrl((current) => {
                  if (current?.startsWith("blob:")) {
                    URL.revokeObjectURL(current);
                  }
                  return null;
                });
                setDraft(settingsToDraft({ ...DEFAULT_PORTAL_SOCIAL_META_SETTINGS }));
              }}
              type="button"
              variant="secondary"
            >
              Reset to defaults
            </Button>
            <Button
              disabled={busy || !isDirty}
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

      {pickerOpen ? (
        <PortalStaticOgDesignPickerModal
          busy={busy}
          onCancel={() => setPickerOpen(false)}
          onConfirm={(design) => {
            void handleDesignPicked(design);
          }}
        />
      ) : null}
    </section>
  );
}
