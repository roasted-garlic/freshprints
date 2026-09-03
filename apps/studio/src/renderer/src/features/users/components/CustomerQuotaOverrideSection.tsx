import { useEffect, useMemo, useState } from "react";

import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import type { PrintRequestQuotaOverride } from "@fresh-prints/shared/types/customer/printRequestQuotaOverride.types";
import {
  resolveEffectivePrintRequestLimits,
  type EffectivePrintRequestLimits,
} from "@fresh-prints/shared/utils/printRequestQuotaOverride";
import {
  DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS,
  type PrintRequestLimitSettings,
} from "@fresh-prints/shared/constants/printRequest/printRequestLimitSettings.constants";

import { Button } from "../../../shared/components/Button";
import { Checkbox } from "../../../shared/components/Checkbox";
import { TextInput } from "../../../shared/components/TextInput";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { printRequestLimitSettingsService } from "../../settings/services/printRequestLimitSettingsService";
import { customerPrintRequestQuotaOverrideService } from "../services/customerPrintRequestQuotaOverrideService";
import {
  buildQuotaOverrideSavePayload,
  resolveInitialCustomerQuotaOverrideEditMode,
  resolveLinkedSeedValue,
  resolveLinkedValueAfterLeavingIndependent,
  type CustomerQuotaOverrideEditMode,
} from "../utils/customerQuotaOverrideEditMode";

function toDatetimeLocalValue(ms: number | null): string {
  if (ms == null) {
    return "";
  }
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDatetimeLocalValue(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const ms = Date.parse(trimmed);
  return Number.isFinite(ms) ? ms : null;
}

function readStoredDimensions(override: PrintRequestQuotaOverride | null | undefined): {
  maxQuantityPerPrintRequest: number | null;
  maxQuantityPerShowPerCustomer: number | null;
} {
  const pr = override?.maxQuantityPerPrintRequest;
  const show = override?.maxQuantityPerShowPerCustomer;
  return {
    maxQuantityPerPrintRequest: typeof pr === "number" ? pr : null,
    maxQuantityPerShowPerCustomer: typeof show === "number" ? show : null,
  };
}

interface CustomerQuotaOverrideSectionProps {
  customer: Customer;
  onCustomerPatched?: (customer: Customer) => void;
}

export function CustomerQuotaOverrideSection({
  customer,
  onCustomerPatched,
}: CustomerQuotaOverrideSectionProps) {
  const { user } = useAuth();
  const canMutate = user ? permissionService.canManageCustomerPrintRequestQuotaOverrides(user) : false;

  const [settings, setSettings] = useState<PrintRequestLimitSettings>(
    DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS,
  );
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<CustomerQuotaOverrideEditMode>("linked");
  const [linkedInput, setLinkedInput] = useState("");
  const [useGlobalLinked, setUseGlobalLinked] = useState(true);
  const [prOverrideInput, setPrOverrideInput] = useState("");
  const [showOverrideInput, setShowOverrideInput] = useState("");
  const [useGlobalPr, setUseGlobalPr] = useState(true);
  const [useGlobalShow, setUseGlobalShow] = useState(true);
  const [expiresLocal, setExpiresLocal] = useState("");
  const [noExpiration, setNoExpiration] = useState(true);
  const [modeSwitchNote, setModeSwitchNote] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [localOverride, setLocalOverride] = useState(customer.printRequestQuotaOverride);

  useEffect(() => {
    setLocalOverride(customer.printRequestQuotaOverride);
  }, [customer.id, customer.printRequestQuotaOverride]);

  useEffect(() => {
    return printRequestLimitSettingsService.subscribe(setSettings, setSettingsError);
  }, []);

  const effective: EffectivePrintRequestLimits = useMemo(
    () =>
      resolveEffectivePrintRequestLimits({
        settings,
        override: localOverride,
        nowMs: Date.now(),
      }),
    [localOverride, settings],
  );

  const hydrateKey = useMemo(() => {
    const dimensions = readStoredDimensions(effective.storedOverride);
    return [
      customer.id,
      dimensions.maxQuantityPerPrintRequest ?? "g",
      dimensions.maxQuantityPerShowPerCustomer ?? "g",
      effective.expiresAtMs ?? "none",
      effective.status,
    ].join("|");
  }, [customer.id, effective.expiresAtMs, effective.status, effective.storedOverride]);

  useEffect(() => {
    const dimensions = readStoredDimensions(effective.storedOverride);
    const nextMode = resolveInitialCustomerQuotaOverrideEditMode(dimensions);
    setEditMode(nextMode);
    setModeSwitchNote(null);

    if (nextMode === "linked") {
      const seed = resolveLinkedSeedValue(dimensions);
      setLinkedInput(seed);
      setUseGlobalLinked(seed === "");
      setPrOverrideInput(seed);
      setShowOverrideInput(seed);
      setUseGlobalPr(seed === "");
      setUseGlobalShow(seed === "");
    } else {
      const hasPr = dimensions.maxQuantityPerPrintRequest != null;
      const hasShow = dimensions.maxQuantityPerShowPerCustomer != null;
      setUseGlobalPr(!hasPr);
      setUseGlobalShow(!hasShow);
      setPrOverrideInput(hasPr ? String(dimensions.maxQuantityPerPrintRequest) : "");
      setShowOverrideInput(hasShow ? String(dimensions.maxQuantityPerShowPerCustomer) : "");
      setLinkedInput("");
      setUseGlobalLinked(false);
    }

    const expiresMs = effective.expiresAtMs;
    if (expiresMs != null && effective.status !== "none") {
      setNoExpiration(false);
      setExpiresLocal(toDatetimeLocalValue(expiresMs));
    } else {
      setNoExpiration(true);
      setExpiresLocal("");
    }
    // hydrateKey captures stored dimension/expiry identity; avoid resetting while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional hydrate gate
  }, [hydrateKey]);

  const statusLabel =
    effective.status === "active"
      ? "Active"
      : effective.status === "expired"
        ? "Expired"
        : "None";

  function switchToIndependent() {
    if (editMode === "independent") {
      return;
    }
    if (useGlobalLinked) {
      setPrOverrideInput("");
      setShowOverrideInput("");
      setUseGlobalPr(true);
      setUseGlobalShow(true);
    } else {
      setPrOverrideInput(linkedInput);
      setShowOverrideInput(linkedInput);
      setUseGlobalPr(false);
      setUseGlobalShow(false);
    }
    setEditMode("independent");
    setModeSwitchNote(null);
  }

  function switchToLinked() {
    if (editMode === "linked") {
      return;
    }
    const pr = useGlobalPr ? null : Number(prOverrideInput);
    const show = useGlobalShow ? null : Number(showOverrideInput);
    const prValue = pr != null && Number.isInteger(pr) ? pr : null;
    const showValue = show != null && Number.isInteger(show) ? show : null;
    const resolved = resolveLinkedValueAfterLeavingIndependent({
      pr: useGlobalPr ? null : prValue,
      show: useGlobalShow ? null : showValue,
    });
    setLinkedInput(resolved.linkedValue);
    setUseGlobalLinked(resolved.linkedValue === "" && !resolved.requiresExplicitLinkedValue);
    if (resolved.requiresExplicitLinkedValue) {
      setUseGlobalLinked(false);
      setModeSwitchNote(
        "Print Request and Customer Show overrides differ. Enter one shared temporary quota before saving, or stay in Set independently.",
      );
    } else {
      setModeSwitchNote(null);
    }
    setEditMode("linked");
  }

  async function saveOverride() {
    if (!canMutate) {
      return;
    }
    setError(null);
    setSuccess(null);

    const payload = buildQuotaOverrideSavePayload({
      mode: editMode,
      useGlobalLinked,
      linkedValue: linkedInput,
      useGlobalPr,
      useGlobalShow,
      prOverrideInput,
      showOverrideInput,
    });
    if (!payload.ok) {
      setError(payload.error);
      return;
    }

    // Expiration alone must not create an override — both-null clears.
    const bothGlobal =
      payload.maxQuantityPerPrintRequest == null &&
      payload.maxQuantityPerShowPerCustomer == null;

    let expiresAtMs: number | null = null;
    if (!bothGlobal && !noExpiration) {
      expiresAtMs = parseDatetimeLocalValue(expiresLocal);
      if (expiresAtMs == null || expiresAtMs <= Date.now()) {
        setError("Expiration must be a future date and time, or choose no expiration.");
        return;
      }
    }

    setIsSaving(true);
    try {
      const result = await customerPrintRequestQuotaOverrideService.update(
        bothGlobal
          ? { customerId: customer.id, clearAll: true }
          : {
              customerId: customer.id,
              maxQuantityPerPrintRequest: payload.maxQuantityPerPrintRequest,
              maxQuantityPerShowPerCustomer: payload.maxQuantityPerShowPerCustomer,
              expiresAtMs,
            },
      );
      const nextOverride =
        result.effective.status === "none"
          ? undefined
          : (result.effective.storedOverride ?? undefined);
      setLocalOverride(nextOverride);
      onCustomerPatched?.({ ...customer, printRequestQuotaOverride: nextOverride });
      setSuccess(
        result.effective.overrideActive
          ? "Quota override saved."
          : "Quota override cleared (both dimensions use global).",
      );
      setModeSwitchNote(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save quota override.");
    } finally {
      setIsSaving(false);
    }
  }

  async function clearOverride() {
    if (!canMutate) {
      return;
    }
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      await customerPrintRequestQuotaOverrideService.update({
        customerId: customer.id,
        clearAll: true,
      });
      setLocalOverride(undefined);
      onCustomerPatched?.({ ...customer, printRequestQuotaOverride: undefined });
      setEditMode("linked");
      setUseGlobalLinked(true);
      setLinkedInput("");
      setUseGlobalPr(true);
      setUseGlobalShow(true);
      setPrOverrideInput("");
      setShowOverrideInput("");
      setNoExpiration(true);
      setExpiresLocal("");
      setModeSwitchNote(null);
      setSuccess("Quota override cleared.");
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Unable to clear quota override.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section aria-labelledby="customer-quota-override-title" className="customer-quota-override-section">
      <div className="customer-quota-override-intro">
        <h3 id="customer-quota-override-title">Customer Quota Override</h3>
        <p>
          Temporary Portal print limits for this customer only. Global Settings stay unchanged for
          everyone else.
        </p>
      </div>

      {settingsError ? (
        <p className="auth-message auth-message-error" role="alert">
          {settingsError}
        </p>
      ) : null}

      <div className="customer-quota-override-summary">
        <div className="customer-quota-override-summary-item">
          <span className="customer-quota-override-summary-label">Status</span>
          <strong
            className={
              effective.status === "active"
                ? "customer-quota-override-status is-active"
                : "customer-quota-override-status"
            }
          >
            {statusLabel}
          </strong>
        </div>
        <div className="customer-quota-override-summary-item">
          <span className="customer-quota-override-summary-label">Effective Print Request</span>
          <strong>{effective.effectiveMaxQuantityPerPrintRequest}</strong>
          <span className="customer-quota-override-summary-hint">
            Global {effective.globalMaxQuantityPerPrintRequest}
          </span>
        </div>
        <div className="customer-quota-override-summary-item">
          <span className="customer-quota-override-summary-label">Effective Customer Show</span>
          <strong>{effective.effectiveMaxQuantityPerShowPerCustomer}</strong>
          <span className="customer-quota-override-summary-hint">
            Global {effective.globalMaxQuantityPerShowPerCustomer}
          </span>
        </div>
      </div>

      {canMutate ? (
        <div className="customer-quota-override-fields">
          <div className="customer-quota-override-mode-row">
            <Checkbox
              checked={editMode === "independent"}
              disabled={isSaving}
              label="Set independently"
              name="quotaOverrideSetIndependently"
              onChange={(event) => {
                if (event.target.checked) {
                  switchToIndependent();
                } else {
                  switchToLinked();
                }
              }}
            />
            <p className="customer-quota-override-mode-hint">
              {editMode === "linked"
                ? "One temporary quota applies to Print Request and Customer Show."
                : "Print Request and Customer Show can use different overrides."}
            </p>
          </div>

          {modeSwitchNote ? (
            <p className="auth-message auth-message-error" role="status">
              {modeSwitchNote}
            </p>
          ) : null}

          {editMode === "linked" ? (
            <div className="customer-quota-override-field-block">
              <Checkbox
                checked={useGlobalLinked}
                disabled={isSaving}
                label="Use global limits"
                name="useGlobalLinkedQuota"
                onChange={(event) => {
                  setUseGlobalLinked(event.target.checked);
                  if (event.target.checked) {
                    setModeSwitchNote(null);
                  }
                }}
              />
              <TextInput
                disabled={isSaving || useGlobalLinked}
                inputMode="numeric"
                label="Temporary quota"
                name="linkedQuotaOverride"
                onChange={(event) => {
                  setLinkedInput(event.target.value);
                  setModeSwitchNote(null);
                }}
                placeholder={String(effective.globalMaxQuantityPerPrintRequest)}
                value={linkedInput}
              />
              <p className="customer-quota-override-applies-to">
                Applies to: Print Request + Customer Show · Global defaults PR{" "}
                {effective.globalMaxQuantityPerPrintRequest} / Show{" "}
                {effective.globalMaxQuantityPerShowPerCustomer}
              </p>
            </div>
          ) : (
            <div className="user-management-form-grid">
              <div className="customer-quota-override-field-block">
                <Checkbox
                  checked={useGlobalPr}
                  disabled={isSaving}
                  label="Use global Print Request limit"
                  name="useGlobalPrintRequestQuota"
                  onChange={(event) => setUseGlobalPr(event.target.checked)}
                />
                <TextInput
                  disabled={isSaving || useGlobalPr}
                  inputMode="numeric"
                  label="Print Request override"
                  name="printRequestQuotaOverride"
                  onChange={(event) => setPrOverrideInput(event.target.value)}
                  placeholder={String(effective.globalMaxQuantityPerPrintRequest)}
                  value={prOverrideInput}
                />
                <p className="customer-quota-override-dimension-hint">
                  Global {effective.globalMaxQuantityPerPrintRequest} · Effective{" "}
                  {useGlobalPr
                    ? effective.globalMaxQuantityPerPrintRequest
                    : Number.isInteger(Number(prOverrideInput))
                      ? prOverrideInput
                      : "—"}
                </p>
              </div>

              <div className="customer-quota-override-field-block">
                <Checkbox
                  checked={useGlobalShow}
                  disabled={isSaving}
                  label="Use global Customer Show limit"
                  name="useGlobalShowQuota"
                  onChange={(event) => setUseGlobalShow(event.target.checked)}
                />
                <TextInput
                  disabled={isSaving || useGlobalShow}
                  inputMode="numeric"
                  label="Customer Show override"
                  name="customerShowQuotaOverride"
                  onChange={(event) => setShowOverrideInput(event.target.value)}
                  placeholder={String(effective.globalMaxQuantityPerShowPerCustomer)}
                  value={showOverrideInput}
                />
                <p className="customer-quota-override-dimension-hint">
                  Global {effective.globalMaxQuantityPerShowPerCustomer} · Effective{" "}
                  {useGlobalShow
                    ? effective.globalMaxQuantityPerShowPerCustomer
                    : Number.isInteger(Number(showOverrideInput))
                      ? showOverrideInput
                      : "—"}
                </p>
              </div>
            </div>
          )}

          <div className="customer-quota-override-field-block">
            <Checkbox
              checked={noExpiration}
              disabled={isSaving}
              label="No expiration"
              name="quotaOverrideNoExpiration"
              onChange={(event) => setNoExpiration(event.target.checked)}
            />
            <TextInput
              disabled={isSaving || noExpiration}
              label="Expires"
              name="quotaOverrideExpiresAt"
              onChange={(event) => setExpiresLocal(event.target.value)}
              type="datetime-local"
              value={expiresLocal}
            />
          </div>
        </div>
      ) : (
        <div className="customer-quota-override-readonly">
          <p>
            Print Request override:{" "}
            <strong>{effective.activeMaxQuantityPerPrintRequest ?? "Use global"}</strong>
          </p>
          <p>
            Customer Show override:{" "}
            <strong>{effective.activeMaxQuantityPerShowPerCustomer ?? "Use global"}</strong>
          </p>
          <p>
            Expiration:{" "}
            <strong>
              {effective.expiresAtMs != null
                ? new Date(effective.expiresAtMs).toLocaleString()
                : "No expiration"}
            </strong>
          </p>
          <p className="customer-quota-override-readonly-note">
            Only an owner can change customer quota overrides.
          </p>
        </div>
      )}

      {error ? (
        <p className="auth-message auth-message-error" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="auth-message auth-message-success" role="status">
          {success}
        </p>
      ) : null}

      {canMutate ? (
        <div className="customer-quota-override-actions">
          <Button
            disabled={isSaving || effective.status === "none"}
            onClick={() => void clearOverride()}
            type="button"
            variant="secondary"
          >
            Clear Override
          </Button>
          <Button disabled={isSaving} onClick={() => void saveOverride()} type="button">
            {isSaving ? "Saving…" : "Save Override"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
