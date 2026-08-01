import { useEffect, useState } from "react";

import {
  DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS,
  PRINT_REQUEST_LIMIT_BOUND_MAX,
  PRINT_REQUEST_LIMIT_BOUND_MIN,
  parsePrintRequestLimitSettingsInput,
  type PrintRequestLimitSettings,
} from "@fresh-prints/shared/constants/printRequest/printRequestLimitSettings.constants";
import { Button } from "../../../shared/components/Button";
import { Checkbox } from "../../../shared/components/Checkbox";
import { usePrintRequestLimitSettings } from "../hooks/usePrintRequestLimitSettings";

type LimitDraft = {
  maxQuantityPerPrintRequest: string;
  maxQuantityPerShowPerCustomer: string;
  linkPrintRequestAndCustomerShowLimits: boolean;
};

function settingsToDraft(settings: PrintRequestLimitSettings): LimitDraft {
  return {
    maxQuantityPerPrintRequest: String(settings.maxQuantityPerPrintRequest),
    maxQuantityPerShowPerCustomer: String(settings.maxQuantityPerShowPerCustomer),
    linkPrintRequestAndCustomerShowLimits: settings.linkPrintRequestAndCustomerShowLimits,
  };
}

function draftEqualsSettings(draft: LimitDraft, settings: PrintRequestLimitSettings): boolean {
  return (
    draft.maxQuantityPerPrintRequest === String(settings.maxQuantityPerPrintRequest) &&
    draft.maxQuantityPerShowPerCustomer === String(settings.maxQuantityPerShowPerCustomer) &&
    draft.linkPrintRequestAndCustomerShowLimits === settings.linkPrintRequestAndCustomerShowLimits
  );
}

function parsePositiveLimitField(
  raw: string,
  label: string,
): { ok: true; value: number } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return {
      ok: false,
      message: `${label} can’t be blank. Enter a number from ${PRINT_REQUEST_LIMIT_BOUND_MIN} to ${PRINT_REQUEST_LIMIT_BOUND_MAX}.`,
    };
  }
  if (!/^\d+$/.test(trimmed)) {
    return {
      ok: false,
      message: `${label} must be a whole number from ${PRINT_REQUEST_LIMIT_BOUND_MIN} to ${PRINT_REQUEST_LIMIT_BOUND_MAX}.`,
    };
  }
  const value = Number.parseInt(trimmed, 10);
  if (value < PRINT_REQUEST_LIMIT_BOUND_MIN || value > PRINT_REQUEST_LIMIT_BOUND_MAX) {
    return {
      ok: false,
      message: `${label} must be between ${PRINT_REQUEST_LIMIT_BOUND_MIN} and ${PRINT_REQUEST_LIMIT_BOUND_MAX}.`,
    };
  }
  return { ok: true, value };
}

function parseDraftForSave(
  draft: LimitDraft,
): { ok: true; settings: PrintRequestLimitSettings } | { ok: false; message: string } {
  const requestLabel = "Max prints per print request";
  const showLabel = "Max prints per customer per show";

  const requestField = parsePositiveLimitField(draft.maxQuantityPerPrintRequest, requestLabel);
  if (!requestField.ok) {
    return requestField;
  }

  const showField = draft.linkPrintRequestAndCustomerShowLimits
    ? requestField
    : parsePositiveLimitField(draft.maxQuantityPerShowPerCustomer, showLabel);
  if (!showField.ok) {
    return showField;
  }

  const parsed = parsePrintRequestLimitSettingsInput({
    maxQuantityPerPrintRequest: requestField.value,
    maxQuantityPerShowPerCustomer: showField.value,
    linkPrintRequestAndCustomerShowLimits: draft.linkPrintRequestAndCustomerShowLimits,
  });
  if (!parsed) {
    return {
      ok: false,
      message: `Print request limits must be whole numbers from ${PRINT_REQUEST_LIMIT_BOUND_MIN} to ${PRINT_REQUEST_LIMIT_BOUND_MAX}.`,
    };
  }

  return { ok: true, settings: parsed };
}

export function PrintRequestLimitSettingsSection() {
  const { error, isLoading, isSaving, save, saved, settings } = usePrintRequestLimitSettings();
  const [draft, setDraft] = useState<LimitDraft>(() => settingsToDraft(settings));
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(settingsToDraft(settings));
    setValidationError(null);
  }, [settings]);

  function setRequestField(raw: string) {
    setValidationError(null);
    setDraft((current) => ({
      ...current,
      maxQuantityPerPrintRequest: raw,
      maxQuantityPerShowPerCustomer: current.linkPrintRequestAndCustomerShowLimits
        ? raw
        : current.maxQuantityPerShowPerCustomer,
    }));
  }

  function setCustomerShowField(raw: string) {
    setValidationError(null);
    setDraft((current) => ({
      ...current,
      maxQuantityPerShowPerCustomer: raw,
      maxQuantityPerPrintRequest: current.linkPrintRequestAndCustomerShowLimits
        ? raw
        : current.maxQuantityPerPrintRequest,
    }));
  }

  function setLinked(nextLinked: boolean) {
    setValidationError(null);
    setDraft((current) => {
      if (nextLinked) {
        return {
          ...current,
          linkPrintRequestAndCustomerShowLimits: true,
          maxQuantityPerShowPerCustomer: current.maxQuantityPerPrintRequest,
        };
      }
      return {
        ...current,
        linkPrintRequestAndCustomerShowLimits: false,
      };
    });
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
  const defaults = DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS;
  const isLinked = draft.linkPrintRequestAndCustomerShowLimits;

  return (
    <section aria-labelledby="print-request-limit-settings-title" className="card settings-section">
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="print-request-limit-settings-title">
          Print request limits
        </h2>
        <p className="settings-section-description">
          Control how many prints customers can place on one working request and how many they may
          allocate to a single show across all their requests. Defaults are {defaults.maxQuantityPerPrintRequest}{" "}
          for both when linked. Changes apply on the next add or queue without a code deploy.
        </p>
      </header>

      {isLoading ? (
        <p aria-live="polite" className="settings-section-status">
          Loading print request limits…
        </p>
      ) : (
        <div className="settings-form-grid">
          <fieldset className="settings-control-item settings-quota-fieldset" disabled={isSaving}>
            <legend className="settings-field-hint">Portal limits</legend>
            <Checkbox
              checked={isLinked}
              disabled={isSaving}
              label="Keep print-request and customer-show limits the same"
              name="linkPrintRequestAndCustomerShowLimits"
              onChange={(event) => setLinked(event.target.checked)}
            />
            <label className="settings-field-label" htmlFor="maxQuantityPerPrintRequest">
              Max prints per print request
              <input
                className="settings-number-input"
                id="maxQuantityPerPrintRequest"
                inputMode="numeric"
                max={PRINT_REQUEST_LIMIT_BOUND_MAX}
                min={PRINT_REQUEST_LIMIT_BOUND_MIN}
                name="maxQuantityPerPrintRequest"
                onChange={(event) => setRequestField(event.target.value)}
                onFocus={(event) => event.currentTarget.select()}
                step={1}
                type="number"
                value={draft.maxQuantityPerPrintRequest}
              />
              <span className="settings-field-hint">
                Sum of item quantities on the Current Request cannot exceed this while building.
              </span>
            </label>
            <label className="settings-field-label" htmlFor="maxQuantityPerShowPerCustomer">
              Max prints per customer per show
              <input
                aria-disabled={isLinked}
                className="settings-number-input"
                disabled={isLinked || isSaving}
                id="maxQuantityPerShowPerCustomer"
                inputMode="numeric"
                max={PRINT_REQUEST_LIMIT_BOUND_MAX}
                min={PRINT_REQUEST_LIMIT_BOUND_MIN}
                name="maxQuantityPerShowPerCustomer"
                onChange={(event) => setCustomerShowField(event.target.value)}
                onFocus={(event) => event.currentTarget.select()}
                step={1}
                type="number"
                value={isLinked ? draft.maxQuantityPerPrintRequest : draft.maxQuantityPerShowPerCustomer}
              />
              <span className="settings-field-hint">
                Cumulative prints one customer may place on a show across separate requests.
                {isLinked
                  ? " Matches the print-request limit while linked."
                  : " Can differ from the per-request cap when unlinked."}
              </span>
            </label>
            {!isLinked ? (
              <p className="settings-field-hint">
                Unlinked limits let customers build smaller requests while still accumulating up to
                the customer-show cap across multiple queues to the same show.
              </p>
            ) : null}
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
