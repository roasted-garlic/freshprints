import { useEffect, useState } from "react";

import {
  DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS,
  PRINT_REQUEST_LIMIT_BOUND_MAX,
  PRINT_REQUEST_LIMIT_BOUND_MIN,
  type PrintRequestLimitSettings,
} from "@fresh-prints/shared/constants/printRequest/printRequestLimitSettings.constants";
import { Button } from "../../../shared/components/Button";
import { usePrintRequestLimitSettings } from "../hooks/usePrintRequestLimitSettings";

type LimitDraft = { maxQuantityPerShowPerCustomer: string };

function settingsToDraft(settings: PrintRequestLimitSettings): LimitDraft {
  return {
    maxQuantityPerShowPerCustomer: String(settings.maxQuantityPerShowPerCustomer),
  };
}

function draftEqualsSettings(draft: LimitDraft, settings: PrintRequestLimitSettings): boolean {
  return draft.maxQuantityPerShowPerCustomer === String(settings.maxQuantityPerShowPerCustomer);
}

function parseDraftForSave(
  draft: LimitDraft,
): { ok: true; settings: PrintRequestLimitSettings } | { ok: false; message: string } {
  const label = "Max prints per Current Request / per customer per show";
  const raw = draft.maxQuantityPerShowPerCustomer.trim();
  if (raw === "") {
    return {
      ok: false,
      message: `${label} can’t be blank. Enter a number from ${PRINT_REQUEST_LIMIT_BOUND_MIN} to ${PRINT_REQUEST_LIMIT_BOUND_MAX}.`,
    };
  }
  if (!/^\d+$/.test(raw)) {
    return {
      ok: false,
      message: `${label} must be a whole number from ${PRINT_REQUEST_LIMIT_BOUND_MIN} to ${PRINT_REQUEST_LIMIT_BOUND_MAX}.`,
    };
  }
  const value = Number.parseInt(raw, 10);
  if (value < PRINT_REQUEST_LIMIT_BOUND_MIN || value > PRINT_REQUEST_LIMIT_BOUND_MAX) {
    return {
      ok: false,
      message: `${label} must be between ${PRINT_REQUEST_LIMIT_BOUND_MIN} and ${PRINT_REQUEST_LIMIT_BOUND_MAX}.`,
    };
  }
  // Mirror L into legacy Cap A for one-release rollback (server also mirrors).
  return {
    ok: true,
    settings: {
      maxQuantityPerShowPerCustomer: value,
      dailyDesignsAddedToRequestsLimit: value,
    },
  };
}

export function PrintRequestLimitSettingsSection() {
  const { error, isLoading, isSaving, save, saved, settings } = usePrintRequestLimitSettings();
  const [draft, setDraft] = useState<LimitDraft>(() => settingsToDraft(settings));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(settingsToDraft(settings));
    setValidationError(null);
  }, [settings]);

  function setField(raw: string) {
    setValidationError(null);
    setDraft({ maxQuantityPerShowPerCustomer: raw });
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
  const isDirty = !draftEqualsSettings(draft, settings);
  const defaultL = DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS.maxQuantityPerShowPerCustomer;

  return (
    <section aria-labelledby="print-request-limit-settings-title" className="card settings-section">
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="print-request-limit-settings-title">
          Print request limits
        </h2>
        <p className="settings-section-description">
          One limit for Portal: max prints on a Current Request equals max prints per customer per
          show. Default is {defaultL}. Changes apply on the next add or queue without a code deploy.
        </p>
      </header>

      {isLoading ? (
        <p aria-live="polite" className="settings-section-status">
          Loading print request limits…
        </p>
      ) : (
        <div className="settings-form-grid">
          <fieldset className="settings-control-item settings-quota-fieldset" disabled={isSaving}>
            <legend className="settings-field-hint">Portal limit</legend>
            <label
              className="settings-field-label"
              htmlFor="maxQuantityPerShowPerCustomer"
            >
              Max prints per Current Request / per customer per show
              <input
                className="settings-number-input"
                id="maxQuantityPerShowPerCustomer"
                inputMode="numeric"
                max={PRINT_REQUEST_LIMIT_BOUND_MAX}
                min={PRINT_REQUEST_LIMIT_BOUND_MIN}
                name="maxQuantityPerShowPerCustomer"
                onChange={(event) => setField(event.target.value)}
                onFocus={(event) => event.currentTarget.select()}
                step={1}
                type="number"
                value={draft.maxQuantityPerShowPerCustomer}
              />
              <span className="settings-field-hint">
                Sum of item quantities on the Current Request cannot exceed this. Queueing requires
                the entire request to fit on one show under the same limit. Customers may queue only
                one Portal request per show.
              </span>
            </label>
          </fieldset>

          <div className="settings-form-actions">
            <Button
              disabled={isSaving}
              onClick={() => {
                setValidationError(null);
                setDraft(settingsToDraft({ ...DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS }));
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
              {isSaving ? "Saving…" : "Save print request limits"}
            </Button>
          </div>

          {saved && !displayError && !isDirty ? (
            <p aria-live="polite" className="auth-message auth-message-success">
              Print request limits saved.
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
