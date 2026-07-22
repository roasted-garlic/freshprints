import { useEffect, useId, useRef, useState } from "react";

import {
  BRAND_LOGO_DISPLAY_SIZE_MAX_PX,
  BRAND_LOGO_DISPLAY_SIZE_MIN_PX,
  BRAND_LOGO_MAX_BYTES,
  DEFAULT_BRAND_LOGO_DISPLAY_SIZES,
  brandLogoBoxFromHeight,
  brandLogoBoxFromWidth,
  brandLogoFieldKey,
  brandLogoPlacementSlot,
  resolveBrandLogoAspectRatio,
  type BrandLogoApp,
  type BrandLogoDisplayBox,
  type BrandLogoDisplayPlacementKey,
  type BrandLogoDisplaySizesInput,
  type BrandLogoSettings,
  type BrandLogoSlotKind,
} from "@fresh-prints/shared/constants/brand/brandLogoSettings.constants";
import studioLogoUrl from "../../../../../assets/brand/fresh-prints-studio-logo.png";
import studioLogoCollapsedUrl from "../../../../../assets/brand/fresh-prints-studio-logo-collapsed.png";
import { Button } from "../../../shared/components/Button";
import { useBrandLogoSettings } from "../hooks/useBrandLogoSettings";

type LogoCardSpec = {
  app: BrandLogoApp;
  slot: BrandLogoSlotKind;
  title: string;
  hint: string;
  fallbackSrc: string | null;
};

const LOGO_CARDS: LogoCardSpec[] = [
  {
    app: "studio",
    slot: "full",
    title: "Studio — full",
    hint: "Sidebar expanded + login wordmark",
    fallbackSrc: studioLogoUrl,
  },
  {
    app: "studio",
    slot: "collapsed",
    title: "Studio — collapsed",
    hint: "Compact sidebar mark",
    fallbackSrc: studioLogoCollapsedUrl,
  },
  {
    app: "portal",
    slot: "full",
    title: "Portal — full",
    hint: "Header, auth pages, OG logo fallback",
    fallbackSrc: null,
  },
  {
    app: "portal",
    slot: "collapsed",
    title: "Portal — collapsed",
    hint: "Compact sidebar mark",
    fallbackSrc: null,
  },
];

const SIZE_FIELDS: { key: BrandLogoDisplayPlacementKey; label: string; hint: string }[] = [
  { key: "portalHeader", label: "Portal header", hint: "App header wordmark" },
  { key: "portalSidebar", label: "Portal sidebar", hint: "Expanded sidebar wordmark" },
  {
    key: "portalSidebarCollapsed",
    label: "Portal sidebar collapsed",
    hint: "Collapsed sidebar mark",
  },
  { key: "portalAuth", label: "Portal auth pages", hint: "Login / register / complete-profile" },
  { key: "studioSidebar", label: "Studio sidebar", hint: "Expanded sidebar wordmark" },
  {
    key: "studioSidebarCollapsed",
    label: "Studio sidebar collapsed",
    hint: "Collapsed sidebar mark",
  },
  { key: "studioLogin", label: "Studio login", hint: "Login page wordmark" },
];

function sizesFromSettings(settings: BrandLogoSettings): BrandLogoDisplaySizesInput {
  return {
    portalHeader: { ...settings.portalHeader },
    portalSidebar: { ...settings.portalSidebar },
    portalSidebarCollapsed: { ...settings.portalSidebarCollapsed },
    portalAuth: { ...settings.portalAuth },
    studioSidebar: { ...settings.studioSidebar },
    studioSidebarCollapsed: { ...settings.studioSidebarCollapsed },
    studioLogin: { ...settings.studioLogin },
  };
}

function boxesEqual(a: BrandLogoDisplayBox, b: BrandLogoDisplayBox): boolean {
  return a.widthPx === b.widthPx && a.heightPx === b.heightPx;
}

function LogoSlotCard({
  spec,
  downloadUrl,
  disabled,
  onClear,
  onUpload,
}: {
  spec: LogoCardSpec;
  downloadUrl: string | null;
  disabled: boolean;
  onClear: () => void;
  onUpload: (file: File) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewSrc = downloadUrl ?? spec.fallbackSrc;
  const usingUpload = Boolean(downloadUrl);

  return (
    <article className="settings-brand-logo-card">
      <header className="settings-brand-logo-card-header">
        <h3 className="settings-brand-logo-card-title">{spec.title}</h3>
        <p className="settings-field-hint">{spec.hint}</p>
      </header>
      <div className="settings-brand-logo-preview-wrap">
        {previewSrc ? (
          <img
            alt=""
            aria-hidden
            className="settings-brand-logo-preview"
            height={spec.slot === "collapsed" ? 48 : 56}
            src={previewSrc}
            width={spec.slot === "collapsed" ? 48 : undefined}
          />
        ) : (
          <p className="settings-field-hint">Portal bundled default (no custom upload yet)</p>
        )}
        <p className="settings-field-hint">{usingUpload ? "Custom upload" : "Default"}</p>
      </div>
      <input
        accept="image/png"
        className="settings-file-input-hidden"
        disabled={disabled}
        id={inputId}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            onUpload(file);
          }
        }}
        ref={inputRef}
        type="file"
      />
      <div className="settings-form-actions">
        <Button
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          type="button"
          variant="primary"
        >
          {usingUpload ? "Replace PNG" : "Upload PNG"}
        </Button>
        <Button
          disabled={disabled || !usingUpload}
          onClick={onClear}
          type="button"
          variant="secondary"
        >
          Clear
        </Button>
      </div>
    </article>
  );
}

export function BrandLogoSettingsSection() {
  const { clear, error, isLoading, isSaving, saveDisplaySizes, settings, upload } =
    useBrandLogoSettings();
  const [sizeDraft, setSizeDraft] = useState<BrandLogoDisplaySizesInput>(() =>
    sizesFromSettings(settings),
  );
  const [sizeValidationError, setSizeValidationError] = useState<string | null>(null);

  useEffect(() => {
    setSizeDraft(sizesFromSettings(settings));
    setSizeValidationError(null);
  }, [settings]);

  const sizesDirty = SIZE_FIELDS.some(({ key }) => !boxesEqual(sizeDraft[key], settings[key]));

  function setLinkedSize(
    key: BrandLogoDisplayPlacementKey,
    axis: "width" | "height",
    rawValue: number,
  ) {
    const { app, slot } = brandLogoPlacementSlot(key);
    const aspectRatio = resolveBrandLogoAspectRatio(settings, app, slot);
    const nextBox =
      axis === "width"
        ? brandLogoBoxFromWidth(rawValue, aspectRatio)
        : brandLogoBoxFromHeight(rawValue, aspectRatio);
    setSizeDraft((current) => ({
      ...current,
      [key]: nextBox,
    }));
    setSizeValidationError(null);
  }

  async function handleSaveSizes() {
    for (const { key } of SIZE_FIELDS) {
      const box = sizeDraft[key];
      if (
        box.widthPx < BRAND_LOGO_DISPLAY_SIZE_MIN_PX ||
        box.widthPx > BRAND_LOGO_DISPLAY_SIZE_MAX_PX ||
        box.heightPx < BRAND_LOGO_DISPLAY_SIZE_MIN_PX ||
        box.heightPx > BRAND_LOGO_DISPLAY_SIZE_MAX_PX
      ) {
        setSizeValidationError(
          `Width and height must be integers from ${BRAND_LOGO_DISPLAY_SIZE_MIN_PX} to ${BRAND_LOGO_DISPLAY_SIZE_MAX_PX} px.`,
        );
        return;
      }
    }
    setSizeValidationError(null);
    await saveDisplaySizes(sizeDraft);
  }

  const displayError = sizeValidationError ?? error;

  return (
    <section aria-labelledby="brand-logo-settings-title" className="card settings-section">
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="brand-logo-settings-title">
          Brand logos
        </h2>
        <p className="settings-section-description">
          Upload PNG logos for Studio and Portal (full wordmark and collapsed mark). Max{" "}
          {Math.floor(BRAND_LOGO_MAX_BYTES / (1024 * 1024))} MB each. Display width and height are
          linked (aspect ratio locked from the active logo asset). Changing either updates the
          other. Favicons and splash sites are unchanged.
        </p>
      </header>

      {isLoading ? (
        <p aria-live="polite" className="settings-section-status">
          Loading brand logos…
        </p>
      ) : (
        <>
          <div className="settings-brand-logo-grid">
            {LOGO_CARDS.map((spec) => {
              const field = brandLogoFieldKey(spec.app, spec.slot);
              const slot = settings[field];
              return (
                <LogoSlotCard
                  disabled={isSaving}
                  downloadUrl={slot?.downloadUrl ?? null}
                  key={field}
                  onClear={() => {
                    void clear(spec.app, spec.slot);
                  }}
                  onUpload={(file) => {
                    void upload(spec.app, spec.slot, file);
                  }}
                  spec={spec}
                />
              );
            })}
          </div>

          <fieldset className="settings-control-item settings-quota-fieldset" disabled={isSaving}>
            <legend className="settings-field-hint">
              Display sizes (width × height, aspect ratio locked)
            </legend>
            <div className="settings-brand-logo-size-grid">
              {SIZE_FIELDS.map(({ key, label, hint }) => (
                <div className="settings-brand-logo-size-field" key={key}>
                  <p className="settings-brand-logo-size-label">{label}</p>
                  <span className="settings-field-hint">{hint}</span>
                  <div className="settings-brand-logo-size-pair">
                    <label className="settings-field-label" htmlFor={`brandLogoW-${key}`}>
                      Width
                      <input
                        className="settings-text-input"
                        id={`brandLogoW-${key}`}
                        inputMode="numeric"
                        max={BRAND_LOGO_DISPLAY_SIZE_MAX_PX}
                        min={BRAND_LOGO_DISPLAY_SIZE_MIN_PX}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (Number.isFinite(next)) {
                            setLinkedSize(key, "width", next);
                          }
                        }}
                        step={1}
                        type="number"
                        value={sizeDraft[key].widthPx}
                      />
                    </label>
                    <label className="settings-field-label" htmlFor={`brandLogoH-${key}`}>
                      Height
                      <input
                        className="settings-text-input"
                        id={`brandLogoH-${key}`}
                        inputMode="numeric"
                        max={BRAND_LOGO_DISPLAY_SIZE_MAX_PX}
                        min={BRAND_LOGO_DISPLAY_SIZE_MIN_PX}
                        onChange={(event) => {
                          const next = Number(event.target.value);
                          if (Number.isFinite(next)) {
                            setLinkedSize(key, "height", next);
                          }
                        }}
                        step={1}
                        type="number"
                        value={sizeDraft[key].heightPx}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div className="settings-form-actions">
              <Button
                disabled={isSaving}
                onClick={() => {
                  setSizeDraft({
                    portalHeader: { ...DEFAULT_BRAND_LOGO_DISPLAY_SIZES.portalHeader },
                    portalSidebar: { ...DEFAULT_BRAND_LOGO_DISPLAY_SIZES.portalSidebar },
                    portalSidebarCollapsed: {
                      ...DEFAULT_BRAND_LOGO_DISPLAY_SIZES.portalSidebarCollapsed,
                    },
                    portalAuth: { ...DEFAULT_BRAND_LOGO_DISPLAY_SIZES.portalAuth },
                    studioSidebar: { ...DEFAULT_BRAND_LOGO_DISPLAY_SIZES.studioSidebar },
                    studioSidebarCollapsed: {
                      ...DEFAULT_BRAND_LOGO_DISPLAY_SIZES.studioSidebarCollapsed,
                    },
                    studioLogin: { ...DEFAULT_BRAND_LOGO_DISPLAY_SIZES.studioLogin },
                  });
                  setSizeValidationError(null);
                }}
                type="button"
                variant="secondary"
              >
                Reset size defaults
              </Button>
              <Button
                disabled={isSaving || !sizesDirty}
                onClick={() => {
                  void handleSaveSizes();
                }}
                type="button"
                variant="primary"
              >
                {isSaving ? "Saving…" : "Save display sizes"}
              </Button>
            </div>
          </fieldset>
        </>
      )}

      {displayError ? (
        <p className="auth-message auth-message-error" role="alert">
          {displayError}
        </p>
      ) : null}
      {isSaving ? (
        <p aria-live="polite" className="settings-section-status">
          Saving brand logo settings…
        </p>
      ) : null}
    </section>
  );
}
