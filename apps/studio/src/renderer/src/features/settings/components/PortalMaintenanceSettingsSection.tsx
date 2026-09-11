import { useEffect, useMemo, useState } from "react";

import {
  PORTAL_MAINTENANCE_DEFAULT_HEADING,
  PORTAL_MAINTENANCE_DEFAULT_MESSAGE,
  PORTAL_MAINTENANCE_MAX_HEADING_LENGTH,
  PORTAL_MAINTENANCE_MAX_MESSAGE_LENGTH,
  type PortalMaintenanceTestCustomerOption,
  type PortalMaintenanceSettings,
} from "@fresh-prints/shared/constants/portal/portalMaintenance.constants";
import { Button } from "../../../shared/components/Button";
import { Toggle } from "../../../shared/components/Toggle";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { Select } from "../../../shared/components/Select";
import type { SelectOption } from "../../../shared/components/Select";
import { usePortalMaintenanceSettings } from "../hooks/usePortalMaintenanceSettings";
import { portalMaintenanceSettingsService } from "../services/portalMaintenanceSettingsService";

function formatAuditValue(value: unknown): string | null {
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toLocaleString();
  }
  return value instanceof Date ? value.toLocaleString() : null;
}

interface PortalMaintenanceDraft {
  enabled: boolean;
  heading: string;
  message: string;
  maintenanceTestCustomerUid: string | null;
}

function settingsToDraft(settings: PortalMaintenanceSettings): PortalMaintenanceDraft {
  return {
    enabled: settings.enabled,
    heading: settings.heading ?? PORTAL_MAINTENANCE_DEFAULT_HEADING,
    message: settings.message ?? PORTAL_MAINTENANCE_DEFAULT_MESSAGE,
    maintenanceTestCustomerUid: settings.maintenanceTestCustomerUid ?? null,
  };
}

export function PortalMaintenanceSettingsSection() {
  const { user } = useAuth();
  const { error, isLoading, isSaving, save, saved, settings } = usePortalMaintenanceSettings();
  const [eligibleCustomers, setEligibleCustomers] = useState<PortalMaintenanceTestCustomerOption[]>([]);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [draft, setDraft] = useState(() => settingsToDraft(settings));

  useEffect(() => {
    if (!user || !permissionService.canManageSettings(user)) {
      setEligibleCustomers([]);
      setCustomersError(null);
      setIsLoadingCustomers(false);
      return;
    }

    let cancelled = false;
    setIsLoadingCustomers(true);
    void portalMaintenanceSettingsService
      .listTestCustomers()
      .then((customers) => {
        if (!cancelled) {
          setEligibleCustomers(customers);
          setCustomersError(null);
          setIsLoadingCustomers(false);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setEligibleCustomers([]);
          setCustomersError(
            loadError instanceof Error ? loadError.message : "Unable to load eligible customers.",
          );
          setIsLoadingCustomers(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    setDraft(settingsToDraft(settings));
  }, [settings]);

  const auditTime = formatAuditValue(settings.updatedAt);
  const isDirty =
    draft.enabled !== settings.enabled ||
    draft.heading.trim() !== (settings.heading ?? PORTAL_MAINTENANCE_DEFAULT_HEADING) ||
    draft.message.trim() !== (settings.message ?? PORTAL_MAINTENANCE_DEFAULT_MESSAGE) ||
    draft.maintenanceTestCustomerUid !== (settings.maintenanceTestCustomerUid ?? null);

  const customerOptions = useMemo(() => {
    const options: SelectOption[] = [...eligibleCustomers]
      .sort((left, right) => left.displayName.localeCompare(right.displayName))
      .map((customer) => ({
        label: `${customer.displayName}${customer.username ? ` · @${customer.username}` : ""}`,
        value: customer.uid,
      }));

    if (
      draft.maintenanceTestCustomerUid &&
      !options.some((option) => option.value === draft.maintenanceTestCustomerUid)
    ) {
      options.unshift({
        disabled: true,
        label: "Configured account unavailable — clear to remove",
        value: draft.maintenanceTestCustomerUid,
      });
    }

    return [{ label: "No maintenance test customer", value: "" }, ...options];
  }, [eligibleCustomers, draft.maintenanceTestCustomerUid]);

  const hasUnavailableTester = Boolean(
    draft.maintenanceTestCustomerUid &&
      customerOptions.some(
        (option) => option.value === draft.maintenanceTestCustomerUid && option.disabled,
      ),
  );

  if (!permissionService.canManageSettings(user)) {
    return null;
  }

  async function handleSave() {
    const heading = draft.heading.trim();
    if (heading.length > PORTAL_MAINTENANCE_MAX_HEADING_LENGTH) {
      return;
    }
    const message = draft.message.trim();
    if (message.length > PORTAL_MAINTENANCE_MAX_MESSAGE_LENGTH) {
      return;
    }
    await save({
      enabled: draft.enabled,
      ...(heading ? { heading } : {}),
      ...(message ? { message } : {}),
      maintenanceTestCustomerUid: draft.maintenanceTestCustomerUid,
    });
  }

  return (
    <section aria-labelledby="portal-maintenance-settings-title" className="card settings-section">
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="portal-maintenance-settings-title">
          Portal maintenance
        </h2>
        <p className="settings-section-description">
          Pause customer Portal activity without rebuilding the Portal. Public customers see a
          read-only message while existing owner/admin recovery access remains available.
        </p>
      </header>

      {isLoading ? <p className="settings-section-status">Loading maintenance status…</p> : null}
      {error ? (
        <p className="auth-message auth-message-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="settings-form-grid">
        <div className="settings-control-item">
          <p className="settings-field-label">Maintenance status</p>
          <Toggle
            checked={draft.enabled}
            disabled={isLoading || isSaving}
            label={draft.enabled ? "ON — Portal is read-only" : "OFF — Portal is operating normally"}
            name="portal-maintenance-enabled"
            onChange={(enabled) => setDraft((current) => ({ ...current, enabled }))}
            tone={draft.enabled ? "success" : "accent"}
          />
          <p className="settings-field-hint">
            The backend enforces this state for stale clients; hiding buttons alone is not the
            safety mechanism.
          </p>
        </div>

        <label className="settings-field-label" htmlFor="portal-maintenance-heading">
          <span>Maintenance heading</span>
          <input
            className="settings-text-input"
            disabled={isLoading || isSaving}
            id="portal-maintenance-heading"
            maxLength={PORTAL_MAINTENANCE_MAX_HEADING_LENGTH}
            onChange={(event) => setDraft((current) => ({ ...current, heading: event.target.value }))}
            type="text"
            value={draft.heading}
          />
          <span className="settings-field-hint">
            {draft.heading.length}/{PORTAL_MAINTENANCE_MAX_HEADING_LENGTH}
          </span>
        </label>

        <label className="settings-field-label" htmlFor="portal-maintenance-message">
          <span>Maintenance message</span>
          <textarea
            className="settings-textarea-input"
            disabled={isLoading || isSaving}
            id="portal-maintenance-message"
            maxLength={PORTAL_MAINTENANCE_MAX_MESSAGE_LENGTH}
            onChange={(event) => setDraft((current) => ({ ...current, message: event.target.value }))}
            rows={3}
            value={draft.message}
          />
          <span className="settings-field-hint">
            Keep this short and non-sensitive ({draft.message.length}/{PORTAL_MAINTENANCE_MAX_MESSAGE_LENGTH}).
          </span>
        </label>

        <div className="settings-control-item">
          <Select
            disabled={isLoading || isSaving || isLoadingCustomers}
            label="Maintenance test customer"
            name="portal-maintenance-test-customer"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                maintenanceTestCustomerUid: event.target.value || null,
              }))
            }
            options={customerOptions}
            searchable
            searchEmptyMessage="No matching active customers"
            searchPlaceholder="Search active customers…"
            value={draft.maintenanceTestCustomerUid ?? ""}
          />
          <p className="settings-field-hint">
            Choose one active linked customer account for temporary Portal testing while maintenance is ON.
            The account keeps all normal customer permissions and restrictions.
          </p>
          {customersError ? <p className="settings-field-hint">{customersError}</p> : null}
          {hasUnavailableTester ? (
            <p className="settings-field-hint" role="alert">
              The configured test account is no longer available. Clear it before saving another
              maintenance change.
            </p>
          ) : null}
        </div>

        {auditTime || settings.updatedBy ? (
          <p className="settings-field-hint">
            Last saved{auditTime ? ` ${auditTime}` : ""}
            {settings.updatedBy ? ` by ${settings.updatedBy}` : ""}.
          </p>
        ) : null}

        <div className="settings-form-actions">
          <Button
            disabled={!isDirty || isLoading || isSaving || isLoadingCustomers || hasUnavailableTester}
            onClick={() => void handleSave()}
          >
            {isSaving ? "Saving…" : "Save maintenance setting"}
          </Button>
          {saved ? (
            <p aria-live="polite" className="settings-save-success">
              Saved
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
