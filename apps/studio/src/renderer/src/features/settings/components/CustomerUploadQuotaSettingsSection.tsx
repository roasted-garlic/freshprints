import { useEffect, useState } from "react";

import {
  CUSTOMER_UPLOAD_QUOTA_BOUND_MAX,
  CUSTOMER_UPLOAD_QUOTA_BOUND_MIN,
  CUSTOMER_UPLOAD_QUOTA_ZIP_BOUND_MAX,
  DEFAULT_CUSTOMER_UPLOAD_QUOTA_SETTINGS,
  type CustomerUploadQuotaSettings,
} from "@fresh-prints/shared/constants/customerUpload/customerUploadQuotaSettings.constants";
import { Button } from "../../../shared/components/Button";
import { useCustomerUploadQuotaSettings } from "../hooks/useCustomerUploadQuotaSettings";

type QuotaDraftKey = keyof Omit<CustomerUploadQuotaSettings, "updatedAt" | "updatedBy">;
type QuotaDraft = Record<QuotaDraftKey, string>;

const FIELDS: {
  key: QuotaDraftKey;
  label: string;
  max: number;
  group: "request" | "donation";
}[] = [
  {
    key: "printRequestCreateBatchLimit",
    label: "Upload sessions / day",
    max: CUSTOMER_UPLOAD_QUOTA_BOUND_MAX,
    group: "request",
  },
  {
    key: "printRequestFinalizeImageLimit",
    label: "Images / day",
    max: CUSTOMER_UPLOAD_QUOTA_BOUND_MAX,
    group: "request",
  },
  {
    key: "printRequestFinalizeZipLimit",
    label: "ZIP uploads / day",
    max: CUSTOMER_UPLOAD_QUOTA_ZIP_BOUND_MAX,
    group: "request",
  },
  {
    key: "donationCreateBatchLimit",
    label: "Upload sessions / day",
    max: CUSTOMER_UPLOAD_QUOTA_BOUND_MAX,
    group: "donation",
  },
  {
    key: "donationFinalizeImageLimit",
    label: "Images / day",
    max: CUSTOMER_UPLOAD_QUOTA_BOUND_MAX,
    group: "donation",
  },
  {
    key: "donationFinalizeZipLimit",
    label: "ZIP uploads / day",
    max: CUSTOMER_UPLOAD_QUOTA_ZIP_BOUND_MAX,
    group: "donation",
  },
];

function settingsToDraft(settings: CustomerUploadQuotaSettings): QuotaDraft {
  return {
    printRequestCreateBatchLimit: String(settings.printRequestCreateBatchLimit),
    printRequestFinalizeImageLimit: String(settings.printRequestFinalizeImageLimit),
    printRequestFinalizeZipLimit: String(settings.printRequestFinalizeZipLimit),
    donationCreateBatchLimit: String(settings.donationCreateBatchLimit),
    donationFinalizeImageLimit: String(settings.donationFinalizeImageLimit),
    donationFinalizeZipLimit: String(settings.donationFinalizeZipLimit),
  };
}

function draftEqualsSettings(draft: QuotaDraft, settings: CustomerUploadQuotaSettings): boolean {
  return FIELDS.every((field) => draft[field.key] === String(settings[field.key]));
}

/**
 * Parse draft strings for save. Blank / non-integer / out-of-range → validation error.
 * Never returns empty or NaN values.
 */
function parseDraftForSave(
  draft: QuotaDraft,
): { ok: true; settings: CustomerUploadQuotaSettings } | { ok: false; message: string } {
  const parsed: Partial<CustomerUploadQuotaSettings> = {};

  for (const field of FIELDS) {
    const raw = draft[field.key].trim();
    if (raw === "") {
      return {
        ok: false,
        message: `${field.label} can’t be blank. Enter a number from ${CUSTOMER_UPLOAD_QUOTA_BOUND_MIN} to ${field.max}.`,
      };
    }
    if (!/^\d+$/.test(raw)) {
      return {
        ok: false,
        message: `${field.label} must be a whole number from ${CUSTOMER_UPLOAD_QUOTA_BOUND_MIN} to ${field.max}.`,
      };
    }
    const value = Number.parseInt(raw, 10);
    if (value < CUSTOMER_UPLOAD_QUOTA_BOUND_MIN || value > field.max) {
      return {
        ok: false,
        message: `${field.label} must be between ${CUSTOMER_UPLOAD_QUOTA_BOUND_MIN} and ${field.max}.`,
      };
    }
    parsed[field.key] = value;
  }

  return { ok: true, settings: parsed as CustomerUploadQuotaSettings };
}

export function CustomerUploadQuotaSettingsSection() {
  const { error, isLoading, isSaving, save, saved, settings } = useCustomerUploadQuotaSettings();
  const [draft, setDraft] = useState<QuotaDraft>(() => settingsToDraft(settings));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(settingsToDraft(settings));
    setValidationError(null);
  }, [settings]);

  function setField(key: QuotaDraftKey, raw: string) {
    setValidationError(null);
    setDraft((current) => ({
      ...current,
      [key]: raw,
    }));
  }

  async function handleSave() {
    const result = parseDraftForSave(draft);
    if (!result.ok) {
      setValidationError(result.message);
      return;
    }
    setValidationError(null);
    await save(result.settings);
  }

  const displayError = validationError ?? error;

  return (
    <section aria-labelledby="customer-upload-quota-settings-title" className="card settings-section">
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="customer-upload-quota-settings-title">
          Customer upload quotas
        </h2>
        <p className="settings-section-description">
          Per-customer America/Chicago (CST/CDT) daily caps for Portal print-request uploads vs
          catalog donations. Donate Designs images/day resets at midnight Central. Changes apply on
          the next upload without a code deploy.
        </p>
      </header>

      {isLoading ? (
        <p aria-live="polite" className="settings-section-status">
          Loading upload quotas…
        </p>
      ) : (
        <div className="settings-form-grid">
          <div className="settings-control-grid">
            <fieldset className="settings-control-item settings-quota-fieldset" disabled={isSaving}>
              <legend className="settings-field-hint">Print-request uploads</legend>
              {FIELDS.filter((field) => field.group === "request").map((field) => (
                <label className="settings-field-label" htmlFor={field.key} key={field.key}>
                  {field.label}
                  <input
                    className="settings-number-input"
                    id={field.key}
                    inputMode="numeric"
                    max={field.max}
                    min={CUSTOMER_UPLOAD_QUOTA_BOUND_MIN}
                    name={field.key}
                    onChange={(event) => setField(field.key, event.target.value)}
                    onFocus={(event) => event.currentTarget.select()}
                    step={1}
                    type="number"
                    value={draft[field.key]}
                  />
                </label>
              ))}
            </fieldset>
            <fieldset className="settings-control-item settings-quota-fieldset" disabled={isSaving}>
              <legend className="settings-field-hint">Catalog donations</legend>
              {FIELDS.filter((field) => field.group === "donation").map((field) => (
                <label className="settings-field-label" htmlFor={field.key} key={field.key}>
                  {field.label}
                  <input
                    className="settings-number-input"
                    id={field.key}
                    inputMode="numeric"
                    max={field.max}
                    min={CUSTOMER_UPLOAD_QUOTA_BOUND_MIN}
                    name={field.key}
                    onChange={(event) => setField(field.key, event.target.value)}
                    onFocus={(event) => event.currentTarget.select()}
                    step={1}
                    type="number"
                    value={draft[field.key]}
                  />
                </label>
              ))}
            </fieldset>
          </div>
          <p className="settings-field-hint">
            Allowed range: {CUSTOMER_UPLOAD_QUOTA_BOUND_MIN}–{CUSTOMER_UPLOAD_QUOTA_BOUND_MAX}{" "}
            (ZIPs max {CUSTOMER_UPLOAD_QUOTA_ZIP_BOUND_MAX}). Code defaults: request{" "}
            {DEFAULT_CUSTOMER_UPLOAD_QUOTA_SETTINGS.printRequestCreateBatchLimit}/
            {DEFAULT_CUSTOMER_UPLOAD_QUOTA_SETTINGS.printRequestFinalizeImageLimit}/
            {DEFAULT_CUSTOMER_UPLOAD_QUOTA_SETTINGS.printRequestFinalizeZipLimit}; donation{" "}
            {DEFAULT_CUSTOMER_UPLOAD_QUOTA_SETTINGS.donationCreateBatchLimit}/
            {DEFAULT_CUSTOMER_UPLOAD_QUOTA_SETTINGS.donationFinalizeImageLimit}/
            {DEFAULT_CUSTOMER_UPLOAD_QUOTA_SETTINGS.donationFinalizeZipLimit}.
          </p>
          {displayError ? (
            <p className="auth-message auth-message-error" role="alert">
              {displayError}
            </p>
          ) : null}
          {saved && !validationError ? (
            <p aria-live="polite" className="auth-message auth-message-success">
              Upload quotas saved.
            </p>
          ) : null}
          <div className="settings-form-actions">
            <Button
              disabled={isSaving}
              onClick={() => {
                setValidationError(null);
                setDraft(settingsToDraft({ ...DEFAULT_CUSTOMER_UPLOAD_QUOTA_SETTINGS }));
              }}
              type="button"
              variant="secondary"
            >
              Reset to defaults
            </Button>
            <Button
              disabled={isSaving || draftEqualsSettings(draft, settings)}
              onClick={() => void handleSave()}
              variant="primary"
            >
              {isSaving ? "Saving…" : "Save upload quotas"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
