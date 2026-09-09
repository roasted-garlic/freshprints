import { useEffect, useMemo, useState } from "react";

import { Button } from "../../../shared/components/Button";
import { useGangSheetSettings } from "../hooks/useGangSheetSettings";

type Draft = {
  width: string;
  sideMargin: string;
  topBottomMargin: string;
  gutter: string;
  maxLength: string;
  labelFont: string;
  pocketPrice: string;
  pocketWeight: string;
  fullPrice: string;
  fullWeight: string;
  oversizedPrice: string;
  oversizedWeight: string;
  extraPrice: string;
  extraWeight: string;
};

function toDraft(settings: ReturnType<typeof useGangSheetSettings>["settings"]): Draft {
  return {
    width: String(settings.gangSheetWidthInches),
    sideMargin: String(settings.gangSheetSideMarginInches),
    topBottomMargin: String(settings.gangSheetTopBottomMarginInches),
    gutter: String(settings.gangSheetGutterInches),
    maxLength: String(settings.gangSheetMaxLengthInches),
    labelFont: String(settings.gangSheetLabelFontSizePx),
    pocketPrice: String(settings.sectionPricing.pocket.priceUsd),
    pocketWeight: String(settings.sectionPricing.pocket.weightOz),
    fullPrice: String(settings.sectionPricing.standardFullSize.priceUsd),
    fullWeight: String(settings.sectionPricing.standardFullSize.weightOz),
    oversizedPrice: String(settings.sectionPricing.standardOversized.priceUsd),
    oversizedWeight: String(settings.sectionPricing.standardOversized.weightOz),
    extraPrice: String(settings.sectionPricing.extraOversized.priceUsd),
    extraWeight: String(settings.sectionPricing.extraOversized.weightOz),
  };
}

function parseDraftNumber(value: string, label: string): { value: number } | { error: string } {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? { value: parsed }
    : { error: `${label} must be a finite number.` };
}

export function GangSheetSettingsSection() {
  const { error, isLoading, isSaving, saved, settings, save } = useGangSheetSettings();
  const [draft, setDraft] = useState(() => toDraft(settings));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(toDraft(settings));
    setValidationError(null);
  }, [settings]);

  const rows = useMemo(
    () => [
      { key: "pocket", label: "Pocket", range: '4" and under', price: "pocketPrice", weight: "pocketWeight" },
      {
        key: "full",
        label: "Standard Full Size",
        range: 'over 4" through 11"',
        price: "fullPrice",
        weight: "fullWeight",
      },
      {
        key: "oversized",
        label: "Standard Oversized",
        range: 'over 11" through 14"',
        price: "oversizedPrice",
        weight: "oversizedWeight",
      },
      { key: "extra", label: "Extra Oversized", range: 'over 14"', price: "extraPrice", weight: "extraWeight" },
    ] as const,
    [],
  );

  function setField(field: keyof Draft, value: string) {
    setValidationError(null);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleSave() {
    const fields: Array<[keyof Draft, string]> = [
      ["width", "Sheet width"],
      ["sideMargin", "Side margin"],
      ["topBottomMargin", "Top/bottom margin"],
      ["gutter", "Gutter"],
      ["maxLength", "Max sheet length"],
      ["labelFont", "Label font size"],
      ["pocketPrice", "Pocket price"],
      ["pocketWeight", "Pocket weight"],
      ["fullPrice", "Standard Full Size price"],
      ["fullWeight", "Standard Full Size weight"],
      ["oversizedPrice", "Standard Oversized price"],
      ["oversizedWeight", "Standard Oversized weight"],
      ["extraPrice", "Extra Oversized price"],
      ["extraWeight", "Extra Oversized weight"],
    ];
    const parsed = new Map<keyof Draft, number>();
    for (const [field, label] of fields) {
      const result = parseDraftNumber(draft[field], label);
      if ("error" in result) {
        setValidationError(result.error);
        return;
      }
      parsed.set(field, result.value);
    }

    await save({
      gangSheetWidthInches: parsed.get("width"),
      gangSheetSideMarginInches: parsed.get("sideMargin"),
      gangSheetTopBottomMarginInches: parsed.get("topBottomMargin"),
      gangSheetGutterInches: parsed.get("gutter"),
      gangSheetMaxLengthInches: parsed.get("maxLength"),
      gangSheetLabelFontSizePx: parsed.get("labelFont"),
      gangSheetPocketPriceUsd: parsed.get("pocketPrice"),
      gangSheetPocketWeightOz: parsed.get("pocketWeight"),
      gangSheetStandardFullSizePriceUsd: parsed.get("fullPrice"),
      gangSheetStandardFullSizeWeightOz: parsed.get("fullWeight"),
      gangSheetStandardOversizedPriceUsd: parsed.get("oversizedPrice"),
      gangSheetStandardOversizedWeightOz: parsed.get("oversizedWeight"),
      gangSheetExtraOversizedPriceUsd: parsed.get("extraPrice"),
      gangSheetExtraOversizedWeightOz: parsed.get("extraWeight"),
    });
  }

  return (
    <section aria-labelledby="gang-sheet-settings-title" className="card settings-section">
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="gang-sheet-settings-title">Gang Sheet Settings</h2>
        <p className="settings-section-description">
          One global configuration for Show Queue, Internal Gang Sheets, and Customer/Internal Print Request generation.
          Width breakpoints are fixed product policy; prices, weights, and physical layout remain editable.
        </p>
      </header>

      {isLoading ? <p aria-live="polite" className="settings-section-status">Loading Gang Sheet Settings…</p> : null}
      {validationError ?? error ? (
        <p className="auth-message auth-message-error" role="alert">{validationError ?? error}</p>
      ) : null}
      {saved ? <p className="settings-section-status" role="status">Gang Sheet Settings saved.</p> : null}

      {!isLoading ? (
        <div className="settings-form-grid gang-sheet-settings-grid">
          <fieldset
            className="settings-control-item settings-quota-fieldset gang-sheet-settings-column"
            disabled={isSaving}
          >
            <legend className="settings-field-hint">Layout</legend>
            <div className="gang-sheet-layout-fields">
              {([
              ["width", "Sheet width (inches)", 10, 60, 0.01],
              ["maxLength", "Max sheet length (inches)", 10, 300, 0.01],
              ["sideMargin", "Side margin (inches)", 0, 5, 0.01],
              ["topBottomMargin", "Top/bottom margin (inches)", 0, 5, 0.01],
              ["gutter", "Gutter between images (inches)", 0, 5, 0.01],
              ["labelFont", "Sheet label font size (px)", 20, 300, 1],
              ] as Array<[keyof Draft, string, number, number, number]>).map(([field, label, min, max, step]) => (
                <label className="settings-field-label" htmlFor={`gang-sheet-${field}`} key={field}>
                  {label}
                  <input
                    className="settings-number-input"
                    id={`gang-sheet-${field}`}
                    max={max}
                    min={min}
                    onChange={(event) => setField(field, event.target.value)}
                    step={step}
                    type="number"
                    value={draft[field]}
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset
            className="settings-control-item settings-quota-fieldset gang-sheet-settings-column"
            disabled={isSaving}
          >
            <legend className="settings-field-hint">Pricing &amp; Weight</legend>
            {rows.map((row) => (
              <div key={row.key} className="gang-sheet-pricing-row">
                <strong>{row.label}</strong>
                <span className="settings-field-hint">{row.range}</span>
                <div className="gang-sheet-pricing-fields">
                  <label htmlFor={`gang-sheet-${row.price}`}>Price per print ($)</label>
                  <input
                    className="settings-number-input"
                    id={`gang-sheet-${row.price}`}
                    min={0}
                    max={999.99}
                    onChange={(event) => setField(row.price, event.target.value)}
                    step={0.01}
                    type="number"
                    value={draft[row.price]}
                  />
                  <label htmlFor={`gang-sheet-${row.weight}`}>Weight per print (oz)</label>
                  <input
                    className="settings-number-input"
                    id={`gang-sheet-${row.weight}`}
                    min={0.01}
                    max={99.99}
                    onChange={(event) => setField(row.weight, event.target.value)}
                    step={0.01}
                    type="number"
                    value={draft[row.weight]}
                  />
                </div>
              </div>
            ))}
          </fieldset>
        </div>
      ) : null}

      <div className="settings-section-actions">
        <Button disabled={isSaving || isLoading} onClick={() => void handleSave()} type="button">
          {isSaving ? "Saving…" : "Save Gang Sheet Settings"}
        </Button>
      </div>
    </section>
  );
}
